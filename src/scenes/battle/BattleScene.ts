import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../../core/Scene';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
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
  }

  override onEntrance(): void {
    this.initBattle();
  }

  protected initBattle(): void {
    // 加载友方（队伍成员 + 主角）
    const selfRole = this.gameState.Roles[this.gameState.SelfIndex];
    if (selfRole) {
      this.allies.push({
        role: selfRole, x: 30, y: 30, team: 0,
        hp: selfRole.HP, mp: selfRole.MP, alive: true, speedBar: 0
      });
    }

    // 加载敌方（根据 battleId 预设）
    for (let i = 0; i < 3; i++) {
      const enemyId = 100 + this.battleId * 10 + i;
      const enemyRole = this.gameState.Roles[enemyId];
      if (enemyRole) {
        this.enemies.push({
          role: enemyRole, x: 40 + i * 3, y: 40, team: 1,
          hp: enemyRole.HP, mp: enemyRole.MP, alive: true, speedBar: 0,
        });
      } else {
        // 生成临时敌人
        const tmp: RoleSave = { ...selfRole, ID: enemyId, Name: `敌人${i + 1}`, HP: 100, MaxHP: 100, Attack: 20, Defence: 10 };
        this.enemies.push({ role: tmp, x: 40 + i * 3, y: 40, team: 1, hp: 100, mp: 0, alive: true, speedBar: 0 });
      }
    }

    this.sortTurnOrder();
    this.phase = 'select';
  }

  protected sortTurnOrder(): void {
    this.turnOrder = [...this.allies.filter(a => a.alive), ...this.enemies.filter(e => e.alive)];
    this.turnOrder.sort((a, b) => (b.role.Speed + b.role.Attack) - (a.role.Speed + a.role.Attack));
    this.currentActorIndex = 0;
  }

  override backRun(): void {
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
      this.removeChildNode(this.menu!);
      this.menu = null;
      this.executeAction(actor, action);
    };
  }

  private executeAction(actor: BattleRole, action: number): void {
    switch (action) {
      case 0: this.actionMove(actor); break;
      case 1: this.actionAttack(actor); break;
      case 2: this.actionMagic(actor); break;
      case 3: this.actionItem(actor); break;
      case 4: this.actionWait(actor); break;
      default: this.actionWait(actor); break;
    }

    this.nextTurn();
  }

  private actionMove(actor: BattleRole): void {
    // 移动光标选择目标位置
    actor.x = this.battleCursor.gridX;
    actor.y = this.battleCursor.gridY;
  }

  private actionAttack(actor: BattleRole): void {
    this.battleCursor.mode = CursorMode.Action;
    const target = this.enemies.find(e => e.alive && e.x === this.battleCursor.gridX && e.y === this.battleCursor.gridY);
    if (target) {
      const damage = this.calMagicHurt(actor.role, target.role, null);
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
      }
    }
  }

  private actionMagic(actor: BattleRole): void {
    // 选择武功
    const magic = actor.role.MagicID[0];
    if (magic) {
      const target = this.enemies.find(e => e.alive);
      if (target) {
        const damage = this.calMagicHurt(actor.role, target.role, this.gameState.Magics[magic]);
        target.hp -= damage;
        if (target.hp <= 0) { target.hp = 0; target.alive = false; }
      }
    }
  }

  private actionItem(actor: BattleRole): void {
    // 使用物品
    const firstItem = actor.role.Item[0];
    if (firstItem) {
      actor.hp = Math.min(actor.role.MaxHP, actor.hp + 50);
    }
  }

  private actionWait(actor: BattleRole): void {
    // 等待：恢复少量HP
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
    this.exitWithResult(0);
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
    this.phase = 'end';
  }

  protected onDefeat(): void {
    this.phase = 'end';
    this.exitWithResult(-1);
  }

  override draw(): void {
    this.beginDrawScene();
    this.battleMap.drawBattleMap(this.camera.x, this.camera.y, this.sceneContainer);

    // 绘制角色
    for (const br of [...this.allies, ...this.enemies]) {
      if (!br.alive) continue;
      const pos = this.battleMap.mapToScreen(br.x, br.y);
      const g = new Graphics();
      g.rect(pos.x - 8, pos.y - 16, 16, 20);
      g.fill({ color: br.team === 0 ? 0x44ff44 : 0xff4444 });

      // 生命条
      const hpRatio = br.hp / br.role.MaxHP;
      g.rect(pos.x - 10, pos.y - 20, 20, 3);
      g.fill({ color: 0x333333 });
      g.rect(pos.x - 10, pos.y - 20, 20 * hpRatio, 3);
      g.fill({ color: hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffff44 : 0xff4444 });

      this.sceneContainer.addChild(g);

      const nameT = Engine.getInstance().createText(br.role.Name, 10, 0xffffff);
      nameT.x = pos.x - 14;
      nameT.y = pos.y - 30;
      this.sceneContainer.addChild(nameT);
    }

    this.endDrawScene();
  }
}
