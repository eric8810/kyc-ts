import { Container, Graphics } from 'pixi.js';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: number;
  startAlpha: number;
  mode: 'gravity' | 'radius';
  angle: number;
  radialAccel: number;
  tangentialAccel: number;
}

/**
 * ParticleSystem — 粒子系统（从 Cocos2d-x 移植）
 * 支持 Gravity（重力）和 Radius（半径）两种模式
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;
  private emitRate = 0;
  private emitCounter = 0;
  private active = false;
  private mode: 'gravity' | 'radius' = 'gravity';

  // 共享属性
  private life = 60;
  private lifeVar = 20;
  private startSize = 4;
  private startSizeVar = 2;
  private endSize = 0;
  private startColor = 0xffffff;
  private startAlpha = 1;
  private endAlpha = 0;
  private posVarX = 0;
  private posVarY = 0;

  // Gravity 模式
  private gravityX = 0;
  private gravityY = 0;
  private speed = 100;
  private speedVar = 30;

  // Radius 模式
  private startRadius = 100;
  private startRadiusVar = 20;
  private endRadius = 0;
  private rotatePerSec = 0;

  private sourceX = 0;
  private sourceY = 0;

  /** 渲染容器（供外部 addChild） */
  private _container: Container = new Container();
  get container(): Container { return this._container; }

  /** 预设创建 */
  static createFire(x: number, y: number): ParticleSystem {
    const ps = new ParticleSystem();
    ps.sourceX = x; ps.sourceY = y;
    ps.mode = 'gravity';
    ps.life = 40; ps.lifeVar = 10;
    ps.startSize = 3; ps.startSizeVar = 2;
    ps.endSize = 0;
    ps.startColor = 0xff6600;
    ps.speed = 60; ps.speedVar = 20;
    ps.gravityY = -80;
    ps.posVarX = 10; ps.posVarY = 5;
    ps.emitRate = 3;
    ps.active = true;
    return ps;
  }

  static createSnow(x: number, y: number, count: number): ParticleSystem {
    const ps = new ParticleSystem();
    ps.sourceX = x; ps.sourceY = 0;
    ps.mode = 'gravity';
    ps.life = 300; ps.lifeVar = 100;
    ps.startSize = 2; ps.startSizeVar = 1;
    ps.startColor = 0xffffff;
    ps.speed = 30; ps.speedVar = 10;
    ps.gravityY = 50;
    ps.posVarX = x;
    ps.emitRate = count / 300;
    ps.active = true;
    return ps;
  }

  static createRain(x: number, y: number, count: number): ParticleSystem {
    const ps = new ParticleSystem();
    ps.sourceX = x / 2; ps.sourceY = 0;
    ps.mode = 'gravity';
    ps.life = 100; ps.lifeVar = 30;
    ps.startSize = 1; ps.startSizeVar = 0;
    ps.startColor = 0x4488cc;
    ps.speed = 400; ps.speedVar = 50;
    ps.gravityY = 500;
    ps.posVarX = x;
    ps.emitRate = count / 100;
    ps.active = true;
    return ps;
  }

  static createExplosion(x: number, y: number): ParticleSystem {
    const ps = new ParticleSystem();
    ps.sourceX = x; ps.sourceY = y;
    ps.mode = 'gravity';
    ps.life = 30; ps.lifeVar = 10;
    ps.startSize = 5; ps.startSizeVar = 3;
    ps.speed = 200; ps.speedVar = 100;
    ps.gravityY = 0;
    ps.emitRate = 30;
    ps.maxParticles = 30;
    ps.active = true;
    return ps;
  }

  update(): void {
    if (!this.active) return;

    // 发射
    this.emitCounter += this.emitRate;
    while (this.emitCounter >= 1 && this.particles.length < this.maxParticles) {
      this.emitCounter--;
      this.particles.push(this.createParticle());
    }

    // 更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;

      if (p.mode === 'gravity') {
        p.vy += this.gravityY * 0.016;
        p.vx += this.gravityX * 0.016;
      } else {
        p.angle += (this.rotatePerSec * Math.PI / 180) * 0.016;
      }

      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private createParticle(): Particle {
    const life = this.life + (Math.random() - 0.5) * 2 * this.lifeVar;
    const angle = Math.random() * Math.PI * 2;
    const spd = this.speed + (Math.random() - 0.5) * 2 * this.speedVar;

    return {
      x: this.sourceX + (Math.random() - 0.5) * 2 * this.posVarX,
      y: this.sourceY + (Math.random() - 0.5) * 2 * this.posVarY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life, maxLife: life,
      size: this.startSize + (Math.random() - 0.5) * 2 * this.startSizeVar,
      color: this.startColor,
      startAlpha: this.startAlpha,
      mode: this.mode,
      angle,
      radialAccel: 0,
      tangentialAccel: 0,
    };
  }

  draw(container: Container): void {
    if (!this.active) return;
    for (const p of this.particles) {
      const ratio = p.life / p.maxLife;
      const alpha = this.startAlpha + (this.endAlpha - this.startAlpha) * (1 - ratio);
      const size = this.startSize + (this.endSize - this.startSize) * (1 - ratio);
      if (size <= 0) continue;

      const g = new Graphics();
      g.rect(p.x - size / 2, p.y - size / 2, size, size);
      g.fill({ color: p.color, alpha: Math.max(0, Math.min(1, alpha)) });
      container.addChild(g);
    }
  }

  stop(): void { this.active = false; }
  pause(): void { this.active = false; }
  resume(): void { this.active = true; }
  isActive(): boolean { return this.active; }
  getParticleCount(): number { return this.particles.length; }
}
