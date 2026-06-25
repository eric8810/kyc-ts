import { Graphics } from 'pixi.js';
import { BattleSceneAct } from './BattleSceneAct';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import type { GameState } from '../../data/Types';

/**
 * BattleScenePaper — 仿黑帝斯即时战斗
 */
export class BattleScenePaper extends BattleSceneAct {
  protected postureBar = 100;
  protected maxPosture = 100;
  protected currentWeapon = 0;
  protected attackCooldown = 0;
  protected weaponCount = 4;

  constructor(gameState: GameState, battleId: number) {
    super(gameState, battleId);
    this.label = 'BattleScenePaper';
  }

  override onEntrance(): void {
    super.onEntrance();
    this.postureBar = this.maxPosture;
  }

  override backRun(): void {
    const input = InputManager.getInstance();

    if (this.attackCooldown > 0) this.attackCooldown--;

    // 移动
    const self = this.allies[0];
    if (self) {
      const dir = input.direction;
      self.x += dir.dx * 0.3;
      self.y += dir.dy * 0.3;
    }

    // 切换武器
    if (input.isKeyPressed('Digit1')) this.currentWeapon = 0;
    if (input.isKeyPressed('Digit2')) this.currentWeapon = 1;
    if (input.isKeyPressed('Digit3')) this.currentWeapon = 2;
    if (input.isKeyPressed('Digit4')) this.currentWeapon = 3;

    // 攻击
    if (input.isKeyDown('Space') && this.attackCooldown <= 0) {
      this.performAttack();
      this.attackCooldown = 20;
    }

    // 更新敌人AI
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

    // 检查战斗结束
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
      if (dist < 10) {
        const damage = Math.max(1, Math.floor((self.role.Attack - enemy.role.Defence / 2) / 20));
        enemy.hp -= damage;
        this.addTextEffect(`-${damage}`, enemy.x, enemy.y - 20, 0xff4444);
        if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      }
    }
  }

  override draw(): void {
    this.beginDrawScene();

    if (this.battleMap) {
      // Simple battle map rendering
    }

    // 架势条
    const postureBg = new Graphics();
    postureBg.rect(10, 580, 200, 15);
    postureBg.fill({ color: 0x333333 });
    this.sceneContainer.addChild(postureBg);

    const postureFill = new Graphics();
    postureFill.rect(10, 580, 200 * (this.postureBar / this.maxPosture), 15);
    postureFill.fill({ color: 0x44aadd });
    this.sceneContainer.addChild(postureFill);

    // 武器图标
    const weaponT = Engine.getInstance().createText(`武: ${this.currentWeapon + 1}`, 14, 0xffdd88);
    weaponT.x = 10; weaponT.y = 560;
    this.sceneContainer.addChild(weaponT);

    this.endDrawScene();
  }
}
