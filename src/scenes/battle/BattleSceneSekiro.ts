import { Graphics } from 'pixi.js';
import { BattleSceneAct } from './BattleSceneAct';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import type { GameState } from '../../data/Types';

/**
 * BattleSceneSekiro — 仿只狼即时战斗
 * 单武学+行走动画+格挡系统
 */
export class BattleSceneSekiro extends BattleSceneAct {
  protected postureBar = 100;
  protected maxPosture = 100;
  protected guardActive = false;
  protected guardCooldown = 0;
  protected currentMagicId = 0;
  protected attackCooldown = 0;
  protected walkFrame = 0;

  constructor(gameState: GameState, battleId: number) {
    super(gameState, battleId);
    this.label = 'BattleSceneSekiro';
  }

  override onEntrance(): void {
    super.onEntrance();
    this.postureBar = this.maxPosture;
  }

  override backRun(): void {
    const input = InputManager.getInstance();

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.guardCooldown > 0) this.guardCooldown--;

    const self = this.allies[0];
    if (!self) return;

    // 移动
    const dir = input.direction;
    if (dir.dx !== 0 || dir.dy !== 0) {
      self.x += dir.dx * 0.2;
      self.y += dir.dy * 0.2;
      this.walkFrame = (this.walkFrame + 1) % 60;
    }

    // 格挡
    this.guardActive = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');

    // 攻击
    if (input.isKeyDown('Space') && this.attackCooldown <= 0) {
      this.performAttack();
      this.attackCooldown = 15;
    }

    // 敌人AI
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dx = self.x - enemy.x;
      const dy = self.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        enemy.x += (dx / dist) * 0.15;
        enemy.y += (dy / dist) * 0.15;
      }
      // 敌人攻击
      if (dist < 5) {
        this.applyEnemyAttack(enemy);
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
      if (dist < 8) {
        const baseDamage = Math.max(1, Math.floor(self.role.Attack / 15));
        const damage = Math.max(1, baseDamage);
        enemy.hp -= damage;
        this.addTextEffect(`-${damage}`, enemy.x, enemy.y - 20, 0xff4444);
        if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      }
    }
  }

  private applyEnemyAttack(enemy: import('./BattleScene').BattleRole): void {
    const self = this.allies[0];
    if (!self) return;

    if (this.guardActive) {
      // 格挡成功
      const postureDamage = Math.max(1, Math.floor(enemy.role.Attack / 20));
      this.postureBar = Math.max(0, this.postureBar - postureDamage);
      this.addTextEffect('BLOCK', self.x, self.y - 20, 0x44aaff);
    } else {
      // 受伤
      const damage = Math.max(1, Math.floor(enemy.role.Attack / 10));
      self.hp -= damage;
      this.addTextEffect(`-${damage}`, self.x, self.y - 20, 0xff4444);
    }
  }

  override draw(): void {
    this.beginDrawScene();

    // 架势条
    const barW = 200;
    const barH = 12;
    const barX = 10;
    const barY = 580;

    const bg = new Graphics();
    bg.rect(barX, barY, barW, barH);
    bg.fill({ color: 0x333333 });
    this.sceneContainer.addChild(bg);

    const fill = new Graphics();
    fill.rect(barX, barY, barW * (this.postureBar / this.maxPosture), barH);
    fill.fill({ color: this.guardActive ? 0x44ff44 : 0x44aadd });
    this.sceneContainer.addChild(fill);

    // 状态文字
    const statusT = Engine.getInstance().createText(
      this.guardActive ? '[防御]' : '',
      14, 0xffdd88
    );
    statusT.x = 10; statusT.y = 560;
    this.sceneContainer.addChild(statusT);

    this.endDrawScene();
  }
}
