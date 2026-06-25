import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { RunNode, NodeState } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * UI 基类 — 通用界面布局框架
 * 顶栏 + 左边栏(头像) + 右侧内容区
 * 对应 C++ UI.h/cpp
 */
export class UI extends RunNode {
  protected topBar: Container;
  protected leftPanel: Container;
  protected contentPanel: Container;
  protected tabButtons: RunNode[] = [];
  protected activeTab = 0;

  protected bgGfx: Graphics;
  protected uiW: number;
  protected uiH: number;

  constructor() {
    super();
    this.label = 'UI';
    this._fullWindow = 1;

    const engine = Engine.getInstance();
    this.uiW = engine.uiWidth;
    this.uiH = engine.uiHeight;

    // 全局背景
    this.bgGfx = new Graphics();
    this.bgGfx.rect(0, 0, this.uiW, this.uiH);
    this.bgGfx.fill({ color: 0x1a1a2e, alpha: 0.95 });
    this.addChild(this.bgGfx);

    // 顶栏
    this.topBar = new Container();
    this.topBar.y = 0;
    this.addChild(this.topBar);

    this.drawTopBar();

    // 左边栏
    this.leftPanel = new Container();
    this.leftPanel.x = 0;
    this.leftPanel.y = 50;
    this.addChild(this.leftPanel);

    // 内容区
    this.contentPanel = new Container();
    this.contentPanel.x = 220;
    this.contentPanel.y = 55;
    this.addChild(this.contentPanel);
  }

  /** 绘制顶栏装饰线 */
  private drawTopBar(): void {
    const g = new Graphics();
    g.rect(0, 0, this.uiW, 45);
    g.fill({ color: 0x2a2a3e });
    g.rect(0, 44, this.uiW, 2);
    g.fill({ color: 0x886633 });
    this.topBar.addChild(g);
  }

  /** 创建标题文本 */
  protected createTitle(text: string, x: number = 20, y: number = 10): Text {
    const t = new Text({
      text,
      style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize: 20, fill: 0xffcc66, fontWeight: 'bold' },
    });
    t.x = x;
    t.y = y;
    return t;
  }

  /** 创建内容文本 */
  protected createContentText(text: string, x: number = 0, y: number = 0, fontSize: number = 16, color: number = 0xffffff): Text {
    const t = new Text({
      text,
      style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize, fill: color, lineHeight: 22 },
    });
    t.x = x;
    t.y = y;
    return t;
  }

  /** 创建标签页按钮区域 */
  protected createTabs(tabs: string[], x: number, y: number): Container {
    const container = new Container();
    container.x = x;
    container.y = y;

    tabs.forEach((tab, i) => {
      const btnW = 70;
      const btnH = 28;
      const g = new Graphics();

      const isActive = i === this.activeTab;
      g.roundRect(i * (btnW + 4), 0, btnW, btnH, 4);
      g.fill({ color: isActive ? 0x886633 : 0x3a3a4a });
      g.roundRect(i * (btnW + 4), 0, btnW, btnH, 4);
      g.stroke({ color: 0x666688, width: 1 });

      const t = new Text({
        text: tab,
        style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize: 14, fill: isActive ? 0xffffff : 0xaaaaaa },
      });
      t.anchor = { x: 0.5, y: 0.5 } as any;
      t.x = i * (btnW + 4) + btnW / 2;
      t.y = btnH / 2;

      container.addChild(g);
      container.addChild(t);
    });

    this.addChild(container);
    return container;
  }

  /** 切换内容面板 */
  protected switchPanel(panel: Container): void {
    this.contentPanel.removeChildren();
    this.contentPanel.addChild(panel);
  }

  /** 绘制分隔线 */
  protected drawDivider(y: number): Graphics {
    const g = new Graphics();
    g.moveTo(0, y);
    g.lineTo(this.uiW - 240, y);
    g.stroke({ color: 0x444466, width: 1 });
    this.contentPanel.addChild(g);
    return g;
  }

  override onPressedCancel(): void {
    this.exitWithResult(-1);
  }

  override onPressedOK(): void {
    this.exitWithResult(0);
  }
}
