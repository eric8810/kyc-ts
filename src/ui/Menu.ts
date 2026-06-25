import { Graphics } from 'pixi.js';
import { RunNode, NodeState, Direct } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

export interface MenuItem {
  text: string;
  enabled: boolean;
  subMenu?: MenuItem[];
  onSelect?: () => void;
  tag?: number;
}

/**
 * Menu — 菜单系统
 * 支持方向键导航、Enter确认、ESC取消、子菜单、高亮选中项
 */
export class Menu extends RunNode {
  private items: MenuItem[] = [];
  private selectedIndex = 0;
  private bgGraphics: Graphics;
  private textObjects: import('pixi.js').Text[] = [];
  private _onResult: ((index: number) => void) | null = null;

  private itemHeight = 28;
  private paddingX = 16;
  private paddingY = 8;
  private fontSize = 16;
  private menuWidth = 0;
  private menuHeight = 0;

  private colors = {
    bg: 0x1a1a2e,
    border: 0x555577,
    selectedBg: 0x335577,
    text: 0xcccccc,
    textSelected: 0xffffff,
    textDisabled: 0x555555,
  };

  constructor(items: MenuItem[], x: number = 0, y: number = 0) {
    super();
    this.label = 'Menu';
    this.x = x;
    this.y = y;
    this.items = items;

    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    this.buildMenu();
  }

  set onResult(fn: ((index: number) => void) | null) { this._onResult = fn; }

  private buildMenu(): void {
    this.textObjects = [];
    const engine = Engine.getInstance();
    let maxWidth = 100;

    for (const item of this.items) {
      const t = engine.createText(item.text, this.fontSize, item.enabled ? this.colors.text : this.colors.textDisabled);
      if (t.width > maxWidth) maxWidth = t.width;
    }

    this.menuWidth = maxWidth + this.paddingX * 2;
    this.menuHeight = this.items.length * this.itemHeight + this.paddingY * 2;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const t = engine.createText(item.text, this.fontSize, item.enabled ? this.colors.text : this.colors.textDisabled);
      t.x = this.paddingX;
      t.y = this.paddingY + i * this.itemHeight + (this.itemHeight - this.fontSize) / 2;
      this.addChild(t);
      this.textObjects.push(t);
    }

    this.drawBackground();
    this.updateSelection();
  }

  private drawBackground(): void {
    const g = this.bgGraphics;
    g.clear();
    g.roundRect(0, 0, this.menuWidth, this.menuHeight, 4);
    g.fill({ color: this.colors.bg, alpha: 0.95 });
    g.roundRect(0, 0, this.menuWidth, this.menuHeight, 4);
    g.stroke({ color: this.colors.border, width: 2 });
  }

  private updateSelection(): void {
    const g = this.bgGraphics;
    // 重绘选中高亮
    g.clear();
    g.roundRect(0, 0, this.menuWidth, this.menuHeight, 4);
    g.fill({ color: this.colors.bg, alpha: 0.95 });

    if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
      const sy = this.paddingY + this.selectedIndex * this.itemHeight;
      g.rect(4, sy, this.menuWidth - 8, this.itemHeight);
      g.fill({ color: this.colors.selectedBg, alpha: 0.6 });
    }

    g.roundRect(0, 0, this.menuWidth, this.menuHeight, 4);
    g.stroke({ color: this.colors.border, width: 2 });

    // 更新文本颜色
    for (let i = 0; i < this.textObjects.length; i++) {
      const item = this.items[i];
      if (i === this.selectedIndex && item.enabled) {
        this.textObjects[i].style.fill = this.colors.textSelected;
      } else if (!item.enabled) {
        this.textObjects[i].style.fill = this.colors.textDisabled;
      } else {
        this.textObjects[i].style.fill = this.colors.text;
      }
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();

    // 方向键导航
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
      this.moveSelection(1);
    }
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) {
      this.moveSelection(-1);
    }

    // Enter 确认
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
      this.confirmSelection();
    }

    // ESC 取消
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(-1);
    }

    // 鼠标交互
    if (input.state.mouseJustPressed) {
      const engine = Engine.getInstance();
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const relX = ux - this.x;
      const relY = uy - this.y;
      if (relX >= 0 && relX < this.menuWidth && relY >= this.paddingY && relY < this.menuHeight - this.paddingY) {
        const idx = Math.floor((relY - this.paddingY) / this.itemHeight);
        if (idx >= 0 && idx < this.items.length && this.items[idx].enabled) {
          this.selectedIndex = idx;
          this.updateSelection();
          this.confirmSelection();
        }
      }
    }

    // 鼠标移动高亮
    if (input.state.mouseX !== input.state.mouseX) return; // no movement
    const engine = Engine.getInstance();
    const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
    const relX = ux - this.x;
    const relY = uy - this.y;
    if (relX >= 0 && relX < this.menuWidth && relY >= this.paddingY && relY < this.menuHeight - this.paddingY) {
      const idx = Math.floor((relY - this.paddingY) / this.itemHeight);
      if (idx >= 0 && idx < this.items.length && idx !== this.selectedIndex) {
        this.selectedIndex = idx;
        this.updateSelection();
      }
    }
  }

  private moveSelection(delta: number): void {
    let newIdx = this.selectedIndex + delta;
    const len = this.items.length;
    // 循环查找下一个可用项
    for (let i = 0; i < len; i++) {
      const wrapped = ((newIdx % len) + len) % len;
      if (this.items[wrapped].enabled) {
        this.selectedIndex = wrapped;
        this.updateSelection();
        return;
      }
      newIdx += delta;
    }
  }

  private confirmSelection(): void {
    const item = this.items[this.selectedIndex];
    if (!item || !item.enabled) return;

    if (item.onSelect) {
      item.onSelect();
    }
    if (item.subMenu) {
      // 子菜单在当前菜单旁边打开
      const subMenu = new Menu(item.subMenu, this.x + this.menuWidth + 4, this.y + this.selectedIndex * this.itemHeight);
      subMenu.onResult = (idx) => {
        this._result = idx;
      };
      // 简化处理：直接调用回调
    }
    if (this._onResult) {
      this._onResult(item.tag ?? this.selectedIndex);
    }
    this.exitWithResult(item.tag ?? this.selectedIndex);
  }

  override onPressedOK(): void { this.confirmSelection(); }
  override onPressedCancel(): void { this.exitWithResult(-1); }
}
