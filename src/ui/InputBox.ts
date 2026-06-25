import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * InputBox — 文本输入框
 * 支持键盘输入（含中文输入法）、光标闪烁、最大长度限制、回车确认
 */
export class InputBox extends RunNode {
  private bgGraphics: Graphics;
  private textDisplay: Text;
  private cursorGraphics: Graphics;
  private _value: string = '';
  private _maxLength: number;
  private _fontSize: number;
  private _width: number;
  private _height: number;
  private _placeholder: string;
  private cursorVisible = true;
  private cursorTimer = 0;
  private _onSubmit: ((value: string) => void) | null = null;

  /** 用于中文输入法的隐藏 textarea */
  private hiddenInput: HTMLTextAreaElement | null = null;

  constructor(width: number = 200, maxLength: number = 20, fontSize: number = 18, placeholder: string = '') {
    super();
    this.label = 'InputBox';
    this._width = width;
    this._height = fontSize + 16;
    this._maxLength = maxLength;
    this._fontSize = fontSize;
    this._placeholder = placeholder;

    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    const engine = Engine.getInstance();
    this.textDisplay = engine.createText(placeholder, fontSize, 0x888888);
    this.textDisplay.x = 8;
    this.textDisplay.y = 8;
    this.addChild(this.textDisplay);

    this.cursorGraphics = new Graphics();
    this.addChild(this.cursorGraphics);

    this.drawBackground();
    this.eventMode = 'static';
  }

  get value(): string { return this._value; }
  set value(v: string) { this._value = v; this.updateDisplay(); }
  set onSubmit(fn: ((value: string) => void) | null) { this._onSubmit = fn; }

  override onEntrance(): void {
    this.setupInput();
  }

  private setupInput(): void {
    // 创建隐藏的 textarea 用于处理中文输入法
    this.hiddenInput = document.createElement('textarea');
    this.hiddenInput.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    this.hiddenInput.maxLength = this._maxLength;
    document.body.appendChild(this.hiddenInput);
    this.hiddenInput.focus();

    this.hiddenInput.addEventListener('input', () => {
      this._value = this.hiddenInput!.value.slice(0, this._maxLength);
      this.updateDisplay();
    });

    this.hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.exitWithResult(-1);
      }
    });

    this.on('pointerdown', () => {
      this.hiddenInput?.focus();
    });
  }

  override backRun(): void {
    // 光标闪烁
    this.cursorTimer++;
    if (this.cursorTimer > 30) {
      this.cursorTimer = 0;
      this.cursorVisible = !this.cursorVisible;
      this.updateCursor();
    }
  }

  private updateDisplay(): void {
    if (this._value) {
      this.textDisplay.text = this._value;
      this.textDisplay.style.fill = 0xffffff;
    } else {
      this.textDisplay.text = this._placeholder;
      this.textDisplay.style.fill = 0x888888;
    }
    this.updateCursor();
  }

  private updateCursor(): void {
    const g = this.cursorGraphics;
    g.clear();
    if (this.cursorVisible && this._value.length < this._maxLength) {
      const cursorX = 8 + this.textDisplay.width + 2;
      g.rect(cursorX, 8, 2, this._fontSize);
      g.fill({ color: 0xffffff, alpha: 0.8 });
    }
  }

  private drawBackground(): void {
    const g = this.bgGraphics;
    g.clear();
    g.roundRect(0, 0, this._width, this._height, 4);
    g.fill({ color: 0x1a1a2e, alpha: 0.9 });
    g.roundRect(0, 0, this._width, this._height, 4);
    g.stroke({ color: 0x555577, width: 1 });
  }

  private submit(): void {
    this.removeHiddenInput();
    if (this._onSubmit) this._onSubmit(this._value);
    this.exitWithResult(0);
  }

  private removeHiddenInput(): void {
    if (this.hiddenInput) {
      this.hiddenInput.remove();
      this.hiddenInput = null;
    }
  }

  override onExit(): void {
    this.removeHiddenInput();
  }

  override onPressedOK(): void { this.submit(); }
  override onPressedCancel(): void {
    this.removeHiddenInput();
    this.exitWithResult(-1);
  }
}
