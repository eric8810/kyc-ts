import { Graphics } from 'pixi.js';
import { BattleSceneAct } from './BattleSceneAct';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import type { GameState } from '../../data/Types';

/**
 * BattleSceneHades — 黑帝斯变体
 * 4武学槽+道具+特殊效果+HUD菜单
 */
export class BattleSceneHades extends BattleSceneAct {
  protected magicSlots: number[] = [0, 0, 0, 0];
  protected currentSlot = 0;
  protected itemSlots: number[] = [0, 0];
  protected attackCooldown = 0;
  protected specialCooldown = 0;
  protected hudVisible = true;

  constructor(gameState: GameState, battleId: number) {
    super(gameState, battleId);
    this.label = 'BattleSceneHades';
  }

  override onEntrance(): void {
    super.onEntrance();
    // 从主角武功列表填充武学槽
    const self = this.allies[0];
    if (self) {
      for (let i = 0; i < 4 && i < self.role.MagicID.length; i++) {
        if (self.role.MagicID[i] > 0) {
          this.magicSlots[i] = self.role.MagicID[i];
        }
      }
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;

    const self = this.allies[0];
    if (!self) return;

    // 移动
    const dir = input.direction;
    self.x += dir.dx * 0.3;
    self.y += dir.dy * 0.3;

    // 切换武学槽
    if (input.isKeyPressed('Digit1')) this.currentSlot = 0;
    if (input.isKeyPressed('Digit2')) this.currentSlot = 1;
    if (input.isKeyPressed('Digit3')) this.currentSlot = 2;
    if (input.isKeyPressed('Digit4')) this.currentSlot = 3;

    // 普通攻击
    if (input.isKeyDown('Space') && this.attackCooldown <= 0) {
      this.performAttack();
      this.attackCooldown = 12;
    }

    // 武学技能
    if (input.isKeyPressed('KeyQ') && this.specialCooldown <= 0) {
      this.useMagicAttack(this.magicSlots[this.currentSlot]);
      this.specialCooldown = 30;
    }

    // 敌人AI
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dx = self.x - enemy.x;
      const dy = self.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        enemy.x += (dx / dist) * 0.1;
        enemy.y += (dy / dist) * 0.1;
      }
    }

    if (this.enemies.every(e => !e.alive)) {
      this.phase = 'end';
    }
  }

  private performAttack(): void {
    const self = this.allies[0];
    if (!self) return;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.sqrt((self.x - enemy.x) ** 2 + (self.y - enemy.y) ** 2);
      if (dist < 12) {
        const damage = Math.max(1, Math.floor((self.role.Attack - enemy.role.Defence / 2) / 25));
        enemy.hp -= damage;
        this.addTextEffect(`-${damage}`, enemy.x, enemy.y - 20, 0xffaaaa);
        if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      }
    }
  }

  private useMagicAttack(magicId: number): void {
    if (magicId <= 0) return;
    const self = this.allies[0];
    if (!self) return;

    const magic = this.gameState.Magics[magicId];
    if (!magic) return;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.sqrt((self.x - enemy.x) ** 2 + (self.y - enemy.y) ** 2);
      if (dist < 15) {
        const damage = Math.max(5, Math.floor((self.role.Attack + (magic.Hurt?.[0] ?? 10)) / 15));
        enemy.hp -= damage;
        this.addTextEffect(`${magic.Name} -${damage}`, enemy.x, enemy.y - 25, 0xff8844);
        if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      }
    }
  }

  override draw(): void {
    this.beginDrawScene();

    // HUD
    if (this.hudVisible) {
      const self = this.allies[0];
      const hpText = Engine.getInstance().createText(
        `HP: ${self?.hp ?? 0}`, 14, 0xff4444
      );
      hpText.x = 10; hpText.y = 560;
      this.sceneContainer.addChild(hpText);

      // 武学槽
      for (let i = 0; i < 4; i++) {
        const magicId = this.magicSlots[i];
        const name = magicId > 0 ? (this.gameState.Magics[magicId]?.Name ?? '---') : '---';
        const color = i === this.currentSlot ? 0xffdd88 : 0x888888;
        const slotT = Engine.getInstance().createText(`${i + 1}:${name}`, 12, color);
        slotT.x = 10 + i * 100; slotT.y = 580;
        this.sceneContainer.addChild(slotT);
      }
    }

    this.endDrawScene();
  }
}
