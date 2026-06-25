import { Graphics } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { Menu, MenuItem } from './Menu';

export class UISystem extends RunNode {
  private bgGfx: Graphics;
  private menu: Menu;
  private onSelectCallback: ((action: string) => void) | null = null;

  constructor() {
    super();
    this.label = 'UISystem';
    const engine = Engine.getInstance();
    const uiW = engine.uiWidth;
    const uiH = engine.uiHeight;

    this.bgGfx = new Graphics();
    this.bgGfx.rect(0, 0, uiW, uiH);
    this.bgGfx.fill({ color: 0x000000, alpha: 0.5 });
    this.addChild(this.bgGfx);

    const actions = ['item', 'status', 'magic', 'team', 'save', 'load', 'config', 'keyconfig', 'resume'];
    const items: MenuItem[] = [
      { text: '物品', enabled: true, tag: 0, onSelect: () => { this.onSelectCallback?.(actions[0]); this.exitWithResult(0); } },
      { text: '状态', enabled: true, tag: 1, onSelect: () => { this.onSelectCallback?.(actions[1]); this.exitWithResult(1); } },
      { text: '武功', enabled: true, tag: 2, onSelect: () => { this.onSelectCallback?.(actions[2]); this.exitWithResult(2); } },
      { text: '队伍', enabled: true, tag: 3, onSelect: () => { this.onSelectCallback?.(actions[3]); this.exitWithResult(3); } },
      { text: '存档', enabled: true, tag: 4, onSelect: () => { this.onSelectCallback?.(actions[4]); this.exitWithResult(4); } },
      { text: '读取', enabled: true, tag: 5, onSelect: () => { this.onSelectCallback?.(actions[5]); this.exitWithResult(5); } },
      { text: '设置', enabled: true, tag: 6, onSelect: () => { this.onSelectCallback?.(actions[6]); this.exitWithResult(6); } },
      { text: '按键配置', enabled: true, tag: 7, onSelect: () => { this.onSelectCallback?.(actions[7]); this.exitWithResult(7); } },
      { text: '返回游戏', enabled: true, tag: 8, onSelect: () => { this.onSelectCallback?.(actions[8]); this.exitWithResult(8); } },
    ];

    this.menu = new Menu(items, (uiW - 200) / 2, 120);
    this.addChildNode(this.menu);
  }

  set onSelect(fn: (action: string) => void) { this.onSelectCallback = fn; }

  override onPressedCancel(): void { this.exitWithResult(8); }
}
