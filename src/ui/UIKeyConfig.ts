import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';

/** 默认按键映射 */
export const DEFAULT_KEY_BINDINGS: Record<string, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  confirm: 'Enter',
  cancel: 'Escape',
  menu: 'Escape',
  status: 'KeyS',
  item: 'KeyI',
};

/**
 * UIKeyConfig — 按键配置界面
 */
export class UIKeyConfig extends RunNode {
  private bindings: Record<string, string>;
  private keys: string[];
  private selectedIndex = 0;
  private rebinding = false;

  constructor() {
    super();
    this.label = 'UIKeyConfig';
    this.bindings = { ...DEFAULT_KEY_BINDINGS };
    this.keys = Object.keys(this.bindings);
    this.renderView();
  }

  private renderView(): void {
    this.removeChildren();
    const engine = Engine.getInstance();

    const title = engine.createText('按键配置', 24, 0xffcc66);
    title.x = 20; title.y = 15;
    this.addChild(title);

    this.keys.forEach((action, i) => {
      const y = 60 + i * 35;
      const selected = i === this.selectedIndex;

      const label = engine.createText(this.actionLabel(action), 16, selected ? 0xffcc66 : 0xcccccc);
      label.x = 40; label.y = y;
      this.addChild(label);

      const keyName = this.rebinding && selected ? '...' : this.bindings[action];
      const keyText = engine.createText(keyName, 16, selected ? 0xffff00 : 0x88aacc);
      keyText.x = 200; keyText.y = y;
      this.addChild(keyText);
    });

    const hint = engine.createText('Enter: 重新绑定  ESC: 返回', 13, 0x666688);
    hint.x = 20; hint.y = 400;
    this.addChild(hint);
  }

  private actionLabel(action: string): string {
    const labels: Record<string, string> = {
      up: '上移', down: '下移', left: '左移', right: '右移',
      confirm: '确认', cancel: '取消', menu: '菜单', status: '状态', item: '物品',
    };
    return labels[action] || action;
  }

  selectUp(): void { this.selectedIndex = Math.max(0, this.selectedIndex - 1); this.renderView(); }
  selectDown(): void { this.selectedIndex = Math.min(this.keys.length - 1, this.selectedIndex + 1); this.renderView(); }

  startRebind(): void {
    this.rebinding = true;
    this.renderView();
  }

  rebindKey(key: string): void {
    if (this.rebinding) {
      this.bindings[this.keys[this.selectedIndex]] = key;
      this.rebinding = false;
      this.renderView();
    }
  }
}
