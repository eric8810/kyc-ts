import { Graphics, Container } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * VirtualStick — 移动端虚拟摇杆
 * 对应 C++ VirtualStick.cpp
 */
export class VirtualStick extends RunNode {
  private stickGfx: Graphics;
  private knobGfx: Graphics;
  private baseRadius = 50;
  private knobRadius = 25;
  private centerX = 0;
  private centerY = 0;
  private active = false;
  private _dx = 0;
  private _dy = 0;
  private touchId: number | null = null;

  get dx(): number { return this._dx; }
  get dy(): number { return this._dy; }
  get isActive(): boolean { return this.active; }

  constructor(x: number, y: number) {
    super();
    this.label = 'VirtualStick';
    this.centerX = x;
    this.centerY = y;

    // 底座
    this.stickGfx = new Graphics();
    this.stickGfx.circle(x, y, this.baseRadius);
    this.stickGfx.fill({ color: 0xffffff, alpha: 0.15 });
    this.stickGfx.circle(x, y, this.baseRadius);
    this.stickGfx.stroke({ color: 0xffffff, alpha: 0.3, width: 2 });
    this.addChild(this.stickGfx);

    // 摇杆头
    this.knobGfx = new Graphics();
    this.knobGfx.circle(x, y, this.knobRadius);
    this.knobGfx.fill({ color: 0xffffff, alpha: 0.3 });
    this.addChild(this.knobGfx);

    this.eventMode = 'static';
    this.setupTouch();
  }

  private setupTouch(): void {
    this.on('touchstart', (e: any) => {
      this.active = true;
      this.moveKnob(e.globalX, e.globalY);
    });

    this.on('touchmove', (e: any) => {
      if (this.active) {
        this.moveKnob(e.globalX, e.globalY);
      }
    });

    this.on('touchend', () => {
      this.active = false;
      this._dx = 0;
      this._dy = 0;
      this.knobGfx.x = this.centerX;
      this.knobGfx.y = this.centerY;
      this.knobGfx.alpha = 0.3;
    });
  }

  private moveKnob(px: number, py: number): void {
    let dx = px - this.centerX;
    let dy = py - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.baseRadius) {
      dx = dx / dist * this.baseRadius;
      dy = dy / dist * this.baseRadius;
    }

    this.knobGfx.x = this.centerX + dx;
    this.knobGfx.y = this.centerY + dy;
    this.knobGfx.alpha = 0.5;
    this._dx = dx / this.baseRadius;
    this._dy = dy / this.baseRadius;
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.stickGfx.visible = v;
    this.knobGfx.visible = v;
  }
}
