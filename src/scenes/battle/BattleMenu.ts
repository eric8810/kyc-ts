import { Container, Graphics } from 'pixi.js';
import { RunNode } from '../../core/RunNode';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import { Menu, MenuItem } from '../../ui/Menu';

/**
 * BattleMenu — 11项战斗菜单
 */
export class BattleMenu extends RunNode {
  private items: string[] = [
    '移动', '攻击', '武功', '物品', '等待', '状态', '自动', '逃跑', '查看', '蓄力', '防御'
  ];
  private enabled: boolean[] = [
    true, true, true, true, true, true, false, true, true, false, true
  ];

  private _selectedAction = 0;
  get selectedAction(): number { return this._selectedAction; }

  private bgGraphics: Graphics;
  private menuItems: import('pixi.js').Text[] = [];
  private _onResult: ((action: number) => void) | null = null;

  constructor() {
    super();
    this.label = 'BattleMenu';
    this.x = 700;
    this.y = 400;
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);
    this.buildMenu();
  }

  set onResult(fn: ((action: number) => void) | null) { this._onResult = fn; }

  setEnabled(action: number, v: boolean): void {
    this.enabled[action] = v;
    this.buildMenu();
  }

  private buildMenu(): void {
    for (const t of this.menuItems) t.destroy();
    this.menuItems = [];

    const engine = Engine.getInstance();
    const cols = 3;
    const itemW = 90;
    const itemH = 28;
    const padX = 5;
    const padY = 5;

    const totalW = cols * (itemW + padX) + padX;
    const rows = Math.ceil(this.items.length / cols);
    const totalH = rows * (itemH + padY) + padY;

    this.bgGraphics.clear();
    this.bgGraphics.roundRect(0, 0, totalW, totalH, 4);
    this.bgGraphics.fill({ color: 0x1a1a2e, alpha: 0.9 });

    for (let i = 0; i < this.items.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * (itemW + padX);
      const y = padY + row * (itemH + padY);
      const isSel = i === this._selectedAction && this.enabled[i];

      if (isSel) {
        const hl = new Graphics();
        hl.rect(x, y, itemW, itemH);
        hl.fill({ color: 0x335577, alpha: 0.5 });
        this.addChild(hl);
        this.menuItems.push(hl as any);
      }

      const t = engine.createText(this.items[i], 13, this.enabled[i] ? (isSel ? 0xffdd88 : 0xcccccc) : 0x444444);
      t.x = x + 5;
      t.y = y + 6;
      this.addChild(t);
      this.menuItems.push(t);
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const cols = 3;
    const rows = Math.ceil(this.items.length / cols);

    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
      let next = this._selectedAction + cols;
      if (next >= this.items.length) next = next % cols;
      while (!this.enabled[next] && next < this.items.length) next += cols;
      if (next < this.items.length) {
        this._selectedAction = next;
        this.buildMenu();
      }
    }
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) {
      let prev = this._selectedAction - cols;
      if (prev < 0) prev = this.items.length - cols + (this._selectedAction % cols);
      while (!this.enabled[prev] && prev >= 0) prev -= cols;
      if (prev >= 0) {
        this._selectedAction = prev;
        this.buildMenu();
      }
    }
    if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD')) {
      let next = this._selectedAction + 1;
      if (next % cols === 0) next -= cols;
      if (next < this.items.length && this.enabled[next]) {
        this._selectedAction = next;
        this.buildMenu();
      }
    }
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA')) {
      let prev = this._selectedAction - 1;
      if (this._selectedAction % cols === 0) prev += cols;
      if (prev >= 0 && this.enabled[prev]) {
        this._selectedAction = prev;
        this.buildMenu();
      }
    }
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
      if (this._onResult) this._onResult(this._selectedAction);
      this.exitWithResult(this._selectedAction);
    }
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(-1);
    }
  }

  /** AI 自动选择评分 */
  autoSelect(attacker: any, defenders: any[]): number {
    // 简单AI：优先攻击、其次武功、否则等待
    if (this.enabled[1]) return 1; // 攻击
    if (this.enabled[2]) return 2; // 武功
    if (this.enabled[4]) return 4; // 等待
    return 4;
  }
}
