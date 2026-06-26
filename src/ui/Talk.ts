import { Graphics, Text, TextStyle } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * Talk — 对话系统（半透明框 + 头像 + 名称 + 分页文本）
 * 对应 C++ Talk.h/cpp
 */
export class Talk extends RunNode {
  private bgGfx: Graphics;
  private nameText: Text;
  private dialogText: Text;
  private headImg: HTMLImageElement | null = null;
  private headSprite: any = null;

  private fullText = '';
  private displayedText = '';
  private displayIndex = 0;
  private displayTimer = 0;
  private displaySpeed = 50; // ms per char
  private done = false;
  private textLines: string[] = [];
  private currentLine = 0;

  private onComplete: (() => void) | null = null;

  constructor() {
    super();
    this.label = 'Talk';
    this._fullWindow = 1;

    const engine = Engine.getInstance();
    const uiW = engine.uiWidth;
    const uiH = engine.uiHeight;

    // 半透明背景
    this.bgGfx = new Graphics();
    this.bgGfx.rect(0, uiH * 0.65, uiW, uiH * 0.35);
    this.bgGfx.fill({ color: 0x000000, alpha: 0.75 });
    this.bgGfx.rect(0, uiH * 0.65, uiW, 2);
    this.bgGfx.fill({ color: 0x886633, alpha: 0.8 });
    this.addChild(this.bgGfx);

    // 角色名
    this.nameText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'SimHei, Microsoft YaHei, sans-serif',
        fontSize: 18,
        fill: 0xffcc66,
        fontWeight: 'bold',
      }),
    });
    this.nameText.x = 90;
    this.nameText.y = uiH * 0.65 + 10;
    this.addChild(this.nameText);

    // 对话文本
    this.dialogText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'SimHei, Microsoft YaHei, sans-serif',
        fontSize: 16,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: uiW - 120,
        lineHeight: 24,
      }),
    });
    this.dialogText.x = 90;
    this.dialogText.y = uiH * 0.65 + 36;
    this.addChild(this.dialogText);
  }

  /** 显示对话 */
  async show(name: string, text: string, headId?: number): Promise<void> {
    this.fullText = text;
    this.displayedText = '';
    this.displayIndex = 0;
    this.displayTimer = 0;
    this.done = false;
    this.nameText.text = name;

    // 文本分行
    const engine = Engine.getInstance();
    const maxWidth = engine.uiWidth - 120;
    this.dialogText.text = text;
    this.dialogText.style.wordWrapWidth = maxWidth;
    this.textLines = [];
    this.currentLine = 0;

    this.visibleNode = true;

    return new Promise<void>((resolve) => {
      this.onComplete = () => {
        this.visibleNode = false;
        resolve();
      };
    });
  }

  /** 逐字显示 */
  private typewriterUpdate(dt: number): void {
    if (this.done) return;
    this.displayTimer += dt * 1000;

    while (this.displayTimer >= this.displaySpeed && this.displayIndex < this.fullText.length) {
      this.displayTimer -= this.displaySpeed;
      this.displayedText += this.fullText[this.displayIndex];
      this.displayIndex++;
      this.dialogText.text = this.displayedText;
    }

    if (this.displayIndex >= this.fullText.length) {
      this.done = true;
    }
  }

  /** 立即显示全部文本 */
  showAll(): void {
    this.displayedText = this.fullText;
    this.displayIndex = this.fullText.length;
    this.done = true;
    this.dialogText.text = this.fullText;
  }

  /** 下一页（如果有） */
  nextPage(): boolean {
    // 简化实现：显示全部后按任意键继续
    if (!this.done) {
      this.showAll();
      return true;
    }
    if (this.onComplete) {
      this.onComplete();
      this.onComplete = null;
      this.exitWithResult(0);
      return false;
    }
    return false;
  }

  override backRun(): void {
    if (!this.visibleNode) return;
    const input = InputManager.getInstance();
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space') || input.isKeyPressed('Escape')) {
      this.nextPage();
      return;
    }
    if (this.done) return;
    // typewriter effect in backRun
    const dt = 1 / 60; // approximate
    this.typewriterUpdate(dt);
  }

  override onPressedOK(): void {
    this.nextPage();
  }
}
