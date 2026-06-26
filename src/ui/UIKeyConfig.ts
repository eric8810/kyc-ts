import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager, DEFAULT_KEY_BINDINGS } from '../engine/InputManager';

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
    this.bindings = InputManager.getInstance().getKeyBindings();
    this.keys = Object.keys(DEFAULT_KEY_BINDINGS);
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

      const keyName = this.rebinding && selected ? '请按新键...' : this.bindings[action];
      const keyText = engine.createText(keyName, 16, selected ? 0xffff00 : 0x88aacc);
      keyText.x = 200; keyText.y = y;
      this.addChild(keyText);
    });

    const hint = engine.createText('Enter: 重新绑定  R: 恢复默认  ESC: 返回', 13, 0x8888aa);
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
      const action = this.keys[this.selectedIndex];
      this.bindings[action] = key;
      InputManager.getInstance().setKeyBinding(action, key);
      this.rebinding = false;
      this.renderView();
    }
  }

  resetDefaults(): void {
    InputManager.getInstance().resetKeyBindings();
    this.bindings = InputManager.getInstance().getKeyBindings();
    this.rebinding = false;
    this.renderView();
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    if (this.rebinding) {
      const key = input.getPressedKeys()[0];
      if (key) this.rebindKey(key);
      return;
    }
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) this.selectUp();
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) this.selectDown();
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) this.startRebind();
    if (input.isKeyPressed('KeyR')) this.resetDefaults();
    if (input.isKeyPressed('Escape')) this.exitWithResult(0);
  }
}
