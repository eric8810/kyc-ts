import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';

/**
 * TextBox — 多模式文本框
 * 支持单行/多行、自动换行、滚动
 */
export class TextBox extends RunNode {
  private bgGraphics: Graphics;
  private textObjects: Text[] = [];
  private _text: string = '';
  private _fontSize: number;
  private _color: number;
  private _lineHeight: number;
  private maxWidth: number;
  private maxLines: number;
  private padX: number;
  private padY: number;
  private lines: string[] = [];
  private scrollOffset = 0;

  constructor(width: number, maxLines: number = 10, fontSize: number = 16, color: number = 0xffffff) {
    super();
    this.label = 'TextBox';
    this._fontSize = fontSize;
    this._color = color;
    this._lineHeight = fontSize + 4;
    this.maxWidth = width;
    this.maxLines = maxLines;
    this.padX = 8;
    this.padY = 6;

    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);
    this.drawBackground();
  }

  get text(): string { return this._text; }
  set text(t: string) {
    this._text = t;
    this.renderText();
  }

  private drawBackground(): void {
    const g = this.bgGraphics;
    g.clear();
    const h = this.maxLines * this._lineHeight + this.padY * 2;
    g.roundRect(0, 0, this.maxWidth, h, 4);
    g.fill({ color: 0x000000, alpha: 0.5 });
    g.roundRect(0, 0, this.maxWidth, h, 4);
    g.stroke({ color: 0x555577, width: 1 });
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const result: string[] = [];
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\n') {
        result.push(currentLine);
        currentLine = '';
        continue;
      }
      const trial = currentLine + ch;
      const metrics = this.measureTextWidth(trial);
      if (metrics > maxWidth) {
        result.push(currentLine);
        currentLine = ch;
      } else {
        currentLine = trial;
      }
    }
    if (currentLine) result.push(currentLine);
    return result;
  }

  private measureTextWidth(t: string): number {
    // 粗略估算：中文字符14px，英文7px
    let w = 0;
    for (const ch of t) {
      w += (ch.charCodeAt(0) > 255) ? this._fontSize : this._fontSize * 0.55;
    }
    return w;
  }

  private renderText(): void {
    for (const t of this.textObjects) t.destroy();
    this.textObjects = [];

    this.lines = this.wrapText(this._text, this.maxWidth - this.padX * 2);
    const engine = Engine.getInstance();

    for (let i = 0; i < Math.min(this.lines.length - this.scrollOffset, this.maxLines); i++) {
      const t = engine.createText(this.lines[i + this.scrollOffset], this._fontSize, this._color);
      t.x = this.padX;
      t.y = this.padY + i * this._lineHeight;
      this.addChild(t);
      this.textObjects.push(t);
    }
  }

  /** 滚动 */
  scroll(delta: number): void {
    const newOffset = this.scrollOffset + delta;
    if (newOffset >= 0 && newOffset <= Math.max(0, this.lines.length - this.maxLines)) {
      this.scrollOffset = newOffset;
      this.renderText();
    }
  }

  /** 滚动到底部 */
  scrollToBottom(): void {
    this.scrollOffset = Math.max(0, this.lines.length - this.maxLines);
    this.renderText();
  }

  /** 清除 */
  clear(): void {
    this._text = '';
    this.lines = [];
    this.scrollOffset = 0;
    for (const t of this.textObjects) t.destroy();
    this.textObjects = [];
  }
}
