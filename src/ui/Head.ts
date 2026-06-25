import { Graphics, Sprite, Texture } from 'pixi.js';
import { RunNode } from '../core/RunNode';

/**
 * Head — 角色头像显示
 * 对应 C++ Head.cpp
 */
export class Head extends RunNode {
  private headGfx: Graphics;
  private sprite: Sprite | null = null;
  private _size: number;

  constructor(size: number = 60) {
    super();
    this.label = 'Head';
    this._size = size;

    this.headGfx = new Graphics();
    this.addChild(this.headGfx);
    this.drawPlaceholder();
  }

  private drawPlaceholder(): void {
    this.headGfx.clear();
    this.headGfx.circle(this._size / 2, this._size / 2, this._size / 2);
    this.headGfx.fill({ color: 0x333344 });
    this.headGfx.circle(this._size / 2, this._size / 2, this._size / 2);
    this.headGfx.stroke({ color: 0x666688, width: 1 });
  }

  /** 设置头像纹理 */
  setTexture(texture: Texture): void {
    if (this.sprite) {
      this.removeChild(this.sprite);
      this.sprite.destroy();
    }
    this.sprite = new Sprite(texture);
    this.sprite.width = this._size;
    this.sprite.height = this._size;
    this.sprite.mask = null;
    this.addChild(this.sprite);
  }

  /** 设置背景色 */
  setBackgroundColor(color: number): void {
    this.headGfx.clear();
    this.headGfx.circle(this._size / 2, this._size / 2, this._size / 2);
    this.headGfx.fill({ color });
  }
}
