import { Graphics } from 'pixi.js';
import { RunNode } from '../core/RunNode';

/**
 * Cloud — 云层效果
 * 17280×8640 世界坐标系中的平流层云
 */
export class Cloud extends RunNode {
  private clouds: { x: number; y: number; speed: number; scale: number; alpha: number }[] = [];
  private g: Graphics;
  private worldW = 17280;
  private worldH = 8640;

  constructor() {
    super();
    this.label = 'Cloud';
    this.g = new Graphics();
    this.addChild(this.g);

    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: Math.random() * this.worldW,
        y: Math.random() * this.worldH,
        speed: 0.2 + Math.random() * 0.8,
        scale: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.3,
      });
    }
  }

  override backRun(): void {
    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x > this.worldW) c.x -= this.worldW;
    }
  }

  override draw(): void {
    this.g.clear();
    for (const c of this.clouds) {
      const size = 40 * c.scale;
      this.g.ellipse(c.x % 1024, c.y % 640, size, size * 0.5);
      this.g.fill({ color: 0xffffff, alpha: c.alpha });
    }
  }
}
