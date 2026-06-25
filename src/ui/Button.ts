import { Graphics, Text, TextStyle } from 'pixi.js';
import { RunNode, NodeState } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * Button — 三态按钮
 * Normal / Pass(悬停) / Press(按下)
 */
export class Button extends RunNode {
  private bgGraphics: Graphics;
  private labelText: Text;
  private _text: string;
  private _width: number;
  private _height: number;
  private _fontSize: number;
  private _enabled: boolean = true;
  private _onClick: (() => void) | null = null;

  /** 按钮颜色 */
  private colors = {
    normal: 0x4a4a5a,
    hover: 0x6a6a7a,
    press: 0x3a3a4a,
    border: 0x8888aa,
    text: 0xffffff,
    textDisabled: 0x666666,
  };

  constructor(text: string, width: number = 160, height: number = 36, fontSize: number = 16) {
    super();
    this._text = text;
    this._width = width;
    this._height = height;
    this._fontSize = fontSize;
    this.label = `Button:${text}`;

    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    const engine = Engine.getInstance();
    this.labelText = engine.createText(text, fontSize, this.colors.text);
    this.labelText.anchor.set(0.5);
    this.labelText.x = width / 2;
    this.labelText.y = height / 2;
    this.addChild(this.labelText);

    this.drawBackground(this.colors.normal);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  get text(): string { return this._text; }
  set text(t: string) {
    this._text = t;
    this.labelText.text = t;
  }
  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) {
    this._enabled = v;
    this.eventMode = v ? 'static' : 'none';
    this.cursor = v ? 'pointer' : 'default';
    this.labelText.style.fill = v ? this.colors.text : this.colors.textDisabled;
    this.drawBackground(v ? this.colors.normal : 0x333344);
  }
  set onClick(fn: (() => void) | null) { this._onClick = fn; }

  override onEntrance(): void {
    this.registerInput();
  }

  private registerInput(): void {
    this.on('pointerover', () => {
      if (this._enabled) {
        this.nodeState = NodeState.Pass;
        this.drawBackground(this.colors.hover);
      }
    });
    this.on('pointerout', () => {
      if (this._enabled) {
        this.nodeState = NodeState.Normal;
        this.drawBackground(this.colors.normal);
      }
    });
    this.on('pointerdown', () => {
      if (this._enabled) {
        this.nodeState = NodeState.Press;
        this.drawBackground(this.colors.press);
      }
    });
    this.on('pointerup', () => {
      if (this._enabled && this._onClick) {
        this._onClick();
      }
      this.nodeState = NodeState.Normal;
      this.drawBackground(this.colors.normal);
    });
  }

  private drawBackground(color: number): void {
    const g = this.bgGraphics;
    g.clear();
    // 主体
    g.roundRect(0, 0, this._width, this._height, 4);
    g.fill({ color });
    // 边框
    g.roundRect(0, 0, this._width, this._height, 4);
    g.stroke({ color: this.colors.border, width: 1 });
    // 高光
    g.rect(2, 2, this._width - 4, (this._height - 4) / 2);
    g.fill({ color: 0xffffff, alpha: 0.08 });
  }

  override onPressedOK(): void {
    if (this._enabled && this._onClick) this._onClick();
  }
}
