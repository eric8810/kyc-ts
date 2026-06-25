import { Graphics } from 'pixi.js';
import { BattleScene } from './BattleScene';
import { Engine } from '../../engine/Engine';
import type { GameState, RoleSave } from '../../data/Types';

/**
 * BattleSceneAct — 动作战斗抽象层
 * 物理坐标、重力、摩擦力
 */
export class BattleSceneAct extends BattleScene {
  protected gravity = 0.5;
  protected friction = 0.8;
  protected positions: Map<number, { x: number; y: number; vx: number; vy: number; onGround: boolean }> = new Map();
  protected attackEffects: { type: string; params: number[] }[] = [];
  protected textEffects: { text: string; x: number; y: number; color: number }[] = [];
  protected semiReal = true;

  constructor(gameState: GameState, battleId: number) {
    super(gameState, battleId);
    this.label = 'BattleSceneAct';
  }

  protected updatePhysics(): void {
    for (const [id, phys] of this.positions) {
      phys.vy += this.gravity;
      phys.vx *= this.friction;
      const br = this.battleRoles.find(b => b.role.ID === id);
      if (br) {
        br.x += phys.vx * 0.1;
        br.y += phys.vy * 0.1;
        if (br.y >= 60) { br.y = 60; phys.vy = 0; phys.onGround = true; }
      }
    }
  }

  protected addTextEffect(text: string, x: number, y: number, color: number = 0xffffff): void {
    this.textEffects.push({ text, x, y, color });
  }

  protected addAttackEffect(type: string, params: number[]): void {
    this.attackEffects.push({ type, params });
  }

  protected semiRealUpdate(): void {
    this.updatePhysics();
  }

  protected turnBasedUpdate(): void {}

  override draw(): void {
    this.beginDrawScene();

    for (const br of this.battleRoles) {
      if (!br.alive) continue;
      const g = new Graphics();
      g.circle(br.x * 6, br.y * 6, 5);
      g.fill({ color: br.team === 0 ? 0x44ff44 : 0xff4444 });
      this.sceneContainer.addChild(g);
    }

    for (const te of this.textEffects) {
      const t = Engine.getInstance().createText(te.text, 14, te.color);
      t.x = te.x; t.y = te.y;
      this.sceneContainer.addChild(t);
    }

    this.endDrawScene();
  }
}
