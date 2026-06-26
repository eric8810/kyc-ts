import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../core/Scene';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import { ResourceTextureCache } from '../../data/ResourceTextureCache';
import { BattleMap } from './BattleMap';
import { BattleCursor, CursorMode } from './BattleCursor';
import { BattleMenu } from './BattleMenu';
import type { GameState, RoleSave, MagicSave } from '../../data/Types';

interface BattleRole {
  role: RoleSave;
  x: number;
  y: number;
  team: number;     // 0=友方 1=敌方
  hp: number;
  mp: number;
  alive: boolean;
  speedBar: number; // 速度条（半即时战斗）
}

export type { BattleRole };

/**
 * BattleScene — 回合制战斗
 * 对应 C++ BattleScene.cpp
 */
export class BattleScene extends Scene {
  protected gameState: GameState = null as unknown as GameState;
  protected battleMap: BattleMap = null as unknown as BattleMap;
  protected battleCursor: BattleCursor = null as unknown as BattleCursor;
  protected menu: BattleMenu | null = null;
  protected allies: BattleRole[] = [];
  protected enemies: BattleRole[] = [];
  protected turnOrder: BattleRole[] = [];
  protected currentActorIndex = 0;
  protected phase: 'init' | 'select' | 'action' | 'end' = 'init';
  protected battleId = 0;
  protected textElements: Text[] = [];
  private battleLog = '选择行动';
  private logFrames = 0;
  private readonly textureCache = ResourceTextureCache.getInstance();
  private pendingExitResult: number | null = null;

  /** 获取所有战斗角色 */
  get battleRoles(): BattleRole[] { return [...this.allies, ...this.enemies]; }
  /** 检查是否战斗结束 */
  get battleEnd(): boolean { return this.phase === 'end'; }
  /** 主角在 allies 中的索引 */
  get selfIndex(): number { return 0; }

  constructor(gameState?: GameState, battleId?: number) {
    super();
    this.label = 'BattleScene';
    if (gameState) this.gameState = gameState;
    if (battleId !== undefined) this.battleId = battleId;
    this.battleMap = new BattleMap();
    this.battleCursor = new BattleCursor(this);
    this.TILE_W = this.battleMap.tileW;
    this.TILE_H = this.battleMap.tileH;
  }

  override onEntrance(): void {
    this.initBattle();
  }

  protected initBattle(): void {
    this.allies = [];
    this.enemies = [];

    // 加载友方（队伍成员 + 主角）
    const selfRole = this.gameState.Roles[this.gameState.SelfIndex];
    if (selfRole) {
      selfRole.Pic = selfRole.Pic || 0;
      this.allies.push({
        role: selfRole, x: 29, y: 31, team: 0,
        hp: selfRole.HP, mp: selfRole.MP, alive: true, speedBar: 0
      });
      this.textureCache.request('resource/fight/fight000', 0);
    }

    // 加载敌方（根据 battleId 预设）
    for (let i = 0; i < 3; i++) {
      const enemyId = 100 + this.battleId * 10 + i;
      const enemyRole = this.gameState.Roles[enemyId];
      if (enemyRole) {
        enemyRole.Pic = enemyRole.Pic || 1 + i;
        this.enemies.push({
          role: enemyRole, x: 39 + i * 3, y: 38 + i, team: 1,
          hp: enemyRole.HP, mp: enemyRole.MP, alive: true, speedBar: 0,
        });
        this.textureCache.request(`resource/fight/fight${String(Math.max(0, enemyRole.Pic)).padStart(3, '0')}`, 0);
      } else {
        // 生成临时敌人
        const tmp: RoleSave = { ...selfRole, ID: enemyId, Name: `敌人${i + 1}`, HP: 100, MaxHP: 100, Attack: 20, Defence: 10, Pic: 1 + i };
        this.enemies.push({ role: tmp, x: 39 + i * 3, y: 38 + i, team: 1, hp: 100, mp: 0, alive: true, speedBar: 0 });
        this.textureCache.request(`resource/fight/fight${String(1 + i).padStart(3, '0')}`, 0);
      }
    }

    this.battleCursor.setPosition45(this.enemies[0]?.x ?? 40, this.enemies[0]?.y ?? 40);
    const selectLayer = new Array(64 * 64).fill(1);
    this.battleCursor.setSelectLayer(selectLayer);
    this.battleLog = '选择行动：方向键移动光标，Enter确认';
    this.logFrames = 240;
    this.sortTurnOrder();
    this.phase = 'select';
  }

  protected sortTurnOrder(): void {
    this.turnOrder = [...this.allies.filter(a => a.alive), ...this.enemies.filter(e => e.alive)];
    this.turnOrder.sort((a, b) => (b.role.Speed + b.role.Attack) - (a.role.Speed + a.role.Attack));
    this.currentActorIndex = 0;
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const actor = this.turnOrder[this.currentActorIndex];
    if (actor?.team === 0 && this.menu) {
      const { dx, dy } = input.direction;
      if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA') ||
          input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD') ||
          input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW') ||
          input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
        this.battleCursor.move(dx, dy);
      }
    }

    switch (this.phase) {
      case 'select': this.selectPhase(); break;
      case 'action': this.actionPhase(); break;
      case 'end': this.endPhase(); break;
    }
  }

  private async selectPhase(): Promise<void> {
    if (this.turnOrder.length === 0) {
      this.phase = 'end';
      return;
    }

    const actor = this.turnOrder[this.currentActorIndex];

    // 敌方AI自动选择
    if (actor.team === 1) {
      const action = this.enemyAI(actor);
      this.executeAction(actor, action);
      return;
    }

    // 玩家选择
    if (!this.menu) {
      this.showBattleMenu(actor);
    }
  }

  private async showBattleMenu(actor: BattleRole): Promise<void> {
    this.menu = new BattleMenu();
    this.menu.x = 700;
    this.menu.y = 350;
    this.addChildNode(this.menu);

    this.menu.onResult = (action) => {
      if (this.menu) this.removeChildNode(this.menu);
      this.menu = null;
      this.executeAction(actor, action);
    };
    this.menu.onCancel = () => {
      if (this.menu) this.removeChildNode(this.menu);
      this.menu = null;
      this.battleLog = '已取消，请重新选择行动';
      this.logFrames = 120;
    };
  }

  private executeAction(actor: BattleRole, action: number): void {
    switch (action) {
      case 0: this.actionMove(actor); break;
      case 1: this.actionAttack(actor); break;
      case 2: this.actionMagic(actor); break;
      case 3: this.actionItem(actor); break;
      case 4: this.actionWait(actor); break;
      case 7: this.battleLog = `${actor.role.Name} 逃跑失败`; break;
      case 10: actor.hp = Math.min(actor.role.MaxHP, actor.hp + 10); this.battleLog = `${actor.role.Name} 防御并回复10生命`; break;
      default: this.actionWait(actor); break;
    }
    this.logFrames = 180;

    this.nextTurn();
  }

  private actionMove(actor: BattleRole): void {
    // 移动光标选择目标位置
    actor.x = this.battleCursor.gridX;
    actor.y = this.battleCursor.gridY;
    this.battleLog = `${actor.role.Name} 移动到(${actor.x},${actor.y})`;
  }

  private actionAttack(actor: BattleRole): void {
    this.battleCursor.mode = CursorMode.Action;
    const opponents = actor.team === 0 ? this.enemies : this.allies;
    const target = opponents.find(e => e.alive && e.x === this.battleCursor.gridX && e.y === this.battleCursor.gridY)
      ?? opponents.find(e => e.alive);
    if (target) {
      const damage = this.calMagicHurt(actor.role, target.role, null);
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
      }
      this.battleCursor.setPosition45(target.x, target.y);
      this.battleLog = `${actor.role.Name} 攻击 ${target.role.Name} 造成 ${damage} 伤害`;
    } else {
      this.battleLog = `${actor.role.Name} 攻击落空`;
    }
  }

  private actionMagic(actor: BattleRole): void {
    // 选择武功
    const magic = actor.role.MagicID[0];
    if (magic) {
      const opponents = actor.team === 0 ? this.enemies : this.allies;
      const target = opponents.find(e => e.alive && e.x === this.battleCursor.gridX && e.y === this.battleCursor.gridY)
        ?? opponents.find(e => e.alive);
      if (target) {
        const magicData = this.gameState.Magics[magic];
        const damage = this.calMagicHurt(actor.role, target.role, magicData);
        target.hp -= damage;
        if (target.hp <= 0) { target.hp = 0; target.alive = false; }
        this.battleCursor.setPosition45(target.x, target.y);
        this.battleLog = `${actor.role.Name} 施展 ${magicData?.Name ?? '武功'}，${target.role.Name} 受 ${damage} 伤害`;
      } else {
        this.battleLog = `${actor.role.Name} 施展武功，但没有目标`;
      }
    } else {
      this.battleLog = `${actor.role.Name} 尚未学会可用武功`;
    }
  }

  private actionItem(actor: BattleRole): void {
    // 使用物品
    const firstItem = actor.role.Item[0];
    if (firstItem) {
      const item = this.gameState.Items[firstItem];
      actor.hp = Math.min(actor.role.MaxHP, actor.hp + 50);
      this.battleLog = `${actor.role.Name} 使用 ${item?.Name ?? '物品'}，回复生命`;
    } else {
      this.battleLog = `${actor.role.Name} 没有可用物品`;
    }
  }

  private actionWait(actor: BattleRole): void {
    actor.hp = Math.min(actor.role.MaxHP, actor.hp + 3);
    this.battleLog = `${actor.role.Name} 等待观望`;
  }

  private nextTurn(): void {
    this.currentActorIndex++;
    if (this.currentActorIndex >= this.turnOrder.length) {
      // 检查胜负
      if (this.enemies.every(e => !e.alive)) {
        this.onVictory();
      } else if (this.allies.every(a => !a.alive)) {
        this.onDefeat();
      } else {
        this.sortTurnOrder();
        this.phase = 'select';
      }
    }
  }

  /** 伤害计算 */
  calMagicHurt(attacker: RoleSave, defender: RoleSave, magic: MagicSave | null): number {
    let baseDamage = attacker.Attack - defender.Defence;
    if (magic) {
      baseDamage += magic.Hurt[0] || 0;
    }
    baseDamage = Math.max(1, baseDamage);
    // 随机波动 ±10%
    const variance = Math.floor(baseDamage * 0.1);
    baseDamage += Math.floor(Math.random() * variance * 2) - variance;
    return Math.max(1, baseDamage);
  }

  protected enemyAI(actor: BattleRole): number {
    return 1; // 敌人总是攻击
  }

  protected actionPhase(): void {
    // 执行动作动画
    this.phase = 'select';
  }

  protected endPhase(): void {
    if (this.logFrames > 0) {
      this.logFrames--;
      return;
    }
    this.exitWithResult(this.pendingExitResult ?? 0);
  }

  protected onVictory(): void {
    // 获得经验
    const exp = 50;
    for (const ally of this.allies) {
      ally.role.Exp += exp;
      if (ally.role.Exp >= ally.role.Level * 100) {
        ally.role.Level++;
        ally.role.MaxHP += 10;
        ally.role.Attack += 2;
      }
    }
    this.battleLog = `战斗胜利，获得经验 ${exp}`;
    this.logFrames = 240;
    this.pendingExitResult = 0;
    this.phase = 'end';
  }

  protected onDefeat(): void {
    this.battleLog = '战斗失败';
    this.logFrames = 240;
    this.pendingExitResult = -1;
    this.phase = 'end';
  }

  override draw(): void {
    this.beginDrawScene();
    this.battleMap.drawBattleMap(this.camera.x, this.camera.y, this.sceneContainer);

    const actors: { z: number; draw: () => void }[] = [];

    // 绘制角色
    for (const br of [...this.allies, ...this.enemies]) {
      if (!br.alive) continue;
      const pos = this.battleMap.mapToScreen(br.x, br.y);
      const sx = pos.x - this.camera.x;
      const sy = pos.y - this.camera.y;
      const fightId = br.team === 0 ? 0 : Math.max(1, br.role.Pic || (1 + this.enemies.indexOf(br)));
      const path = `resource/fight/fight${String(fightId).padStart(3, '0')}`;
      this.textureCache.request(path, 0);

      actors.push({
        z: (br.x + br.y) * 1024 + br.x,
        draw: () => {
          const sprite = this.textureCache.createSprite(path, 0, sx, sy);
          if (sprite) {
            sprite.scale.set(0.85);
            this.sceneContainer.addChild(sprite);
          } else {
            const g = new Graphics();
            g.rect(sx - 8, sy - 38, 16, 28);
            g.fill({ color: br.team === 0 ? 0x44ff44 : 0xff4444 });
            this.sceneContainer.addChild(g);
          }

          const hpRatio = Math.max(0, Math.min(1, br.hp / br.role.MaxHP));
          const hp = new Graphics();
          hp.rect(sx - 16, sy - 46, 32, 4);
          hp.fill({ color: 0x101010, alpha: 0.9 });
          hp.rect(sx - 16, sy - 46, 32 * hpRatio, 4);
          hp.fill({ color: hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffff44 : 0xff4444 });
          this.sceneContainer.addChild(hp);

          const nameT = Engine.getInstance().createText(br.role.Name, 10, 0xffffff);
          nameT.x = sx - 18;
          nameT.y = sy - 62;
          this.sceneContainer.addChild(nameT);
        }
      });
    }

    actors.sort((a, b) => a.z - b.z).forEach(a => a.draw());

    this.battleCursor.draw();
    this.sceneContainer.addChild(this.battleCursor);

    const engine = Engine.getInstance();
    const logBox = new Graphics();
    logBox.rect(14, engine.uiHeight - 64, engine.uiWidth - 28, 48);
    logBox.fill({ color: 0x000000, alpha: 0.74 });
    logBox.rect(14, engine.uiHeight - 64, engine.uiWidth - 28, 48);
    logBox.stroke({ color: 0xd8d8d8, width: 1 });
    this.sceneContainer.addChild(logBox);

    const actor = this.turnOrder[this.currentActorIndex];
    const text = Engine.getInstance().createText(`${this.battleLog}${actor ? `　当前：${actor.role.Name}` : ''}`, 15, 0xffee88);
    text.x = 28;
    text.y = engine.uiHeight - 50;
    this.sceneContainer.addChild(text);

    this.endDrawScene();
  }
}
