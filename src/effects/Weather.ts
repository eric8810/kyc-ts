import { Container, Graphics } from 'pixi.js';

/**
 * Weather — 天气效果
 * 雨/雪/闪电
 */
export class Weather {
  private type: 'none' | 'rain' | 'snow' = 'none';
  private drops: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];
  private lightningAlpha = 0;
  private lightningTimer = 0;

  constructor() {}

  setType(type: 'none' | 'rain' | 'snow'): void {
    this.type = type;
    this.initDrops();
  }

  private initDrops(): void {
    this.drops = [];
    const count = this.type === 'rain' ? 150 : 60;
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: Math.random() * 1024,
        y: Math.random() * 640,
        speed: this.type === 'rain' ? 300 + Math.random() * 200 : 30 + Math.random() * 20,
        size: this.type === 'rain' ? 1 : 2 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }
  }

  update(dt: number): void {
    if (this.type === 'none') return;

    for (const drop of this.drops) {
      drop.y += drop.speed * dt;
      if (this.type === 'rain') {
        drop.x -= 50 * dt;
      } else {
        drop.x += Math.sin(drop.y * 0.01) * 10 * dt;
      }
      if (drop.y > 640) {
        drop.y = -5;
        drop.x = Math.random() * 1024;
      }
    }

    // 闪电效果
    if (this.type === 'rain' && Math.random() < 0.003) {
      this.lightningAlpha = 0.8;
      this.lightningTimer = 5;
    }
    if (this.lightningTimer > 0) {
      this.lightningTimer--;
      this.lightningAlpha *= 0.5;
    }
  }

  draw(container: Container): void {
    if (this.type === 'none') return;

    for (const drop of this.drops) {
      const g = new Graphics();
      if (this.type === 'rain') {
        g.rect(drop.x, drop.y, 1, drop.size * 5);
        g.fill({ color: 0x6688cc, alpha: drop.alpha * 0.5 });
      } else {
        g.circle(drop.x, drop.y, drop.size);
        g.fill({ color: 0xffffff, alpha: drop.alpha });
      }
      container.addChild(g);
    }

    if (this.lightningAlpha > 0.01) {
      const g = new Graphics();
      g.rect(0, 0, 1024, 640);
      g.fill({ color: 0xffffff, alpha: this.lightningAlpha });
      container.addChild(g);
    }
  }
}

/**
 * Cloud — 云系统
 * 天空飘动的云
 */
export class Cloud {
  private clouds: { x: number; y: number; w: number; h: number; speed: number; alpha: number }[] = [];

  constructor(count: number = 6) {
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * 1500,
        y: 20 + Math.random() * 60,
        w: 80 + Math.random() * 120,
        h: 20 + Math.random() * 30,
        speed: 5 + Math.random() * 15,
        alpha: 0.1 + Math.random() * 0.2,
      });
    }
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 1100) c.x = -c.w;
    }
  }

  draw(container: Container): void {
    for (const c of this.clouds) {
      const g = new Graphics();
      g.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2);
      g.fill({ color: 0xffffff, alpha: c.alpha });
      container.addChild(g);
    }
  }
}
