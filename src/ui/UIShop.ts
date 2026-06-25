import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import type { GameState, ShopSave } from '../data/Types';

/**
 * UIShop — 商店界面
 * 对应 C++ UIShop.cpp
 */
export class UIShop extends RunNode {
  gameState!: GameState;
  private shop!: ShopSave;
  private selectedIndex = 0;
  private mode: 'buy' | 'sell' = 'buy';

  loadShop(state: GameState, shopId: number): void {
    this.gameState = state;
    this.shop = state.Shops[shopId];
    this.drawShop();
  }

  private drawShop(): void {
    this.removeChildren();
    if (!this.shop) return;

    const engine = Engine.getInstance();

    // 标题
    const title = engine.createText(`🏪 ${this.shop.Name}`, 20, 0xffcc66);
    title.x = 20; title.y = 10;
    this.addChild(title);

    // 模式切换
    const modeText = engine.createText(`[${this.mode === 'buy' ? '购买' : '出售'}] (Tab切换)`, 14, 0x8888aa);
    modeText.x = 20; modeText.y = 36;
    this.addChild(modeText);

    // 商品列表
    for (let i = 0; i < 5; i++) {
      const itemId = this.shop.ItemID?.[i] || 0;
      if (itemId <= 0) continue;

      const item = this.gameState.Items[itemId];
      if (!item) continue;

      const y = 70 + i * 50;
      const selected = i === this.selectedIndex;

      const bg = new Graphics();
      bg.roundRect(15, y - 2, 600, 44, 4);
      bg.fill({ color: selected ? 0x3a3a5a : 0x1a1a2e });
      this.addChild(bg);

      const name = engine.createText(`${item.Name}`, 16, selected ? 0xffcc66 : 0xffffff);
      name.x = 25; name.y = y + 4;
      this.addChild(name);

      const price = engine.createText(`💰 ${item.Price}`, 14, 0x88cc88);
      price.x = 25; price.y = y + 24;
      this.addChild(price);

      const desc = engine.createText(item.Introduction?.substring(0, 30) || '', 12, 0x888888);
      desc.x = 200; desc.y = y + 12;
      this.addChild(desc);
    }
  }

  selectUp(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.drawShop();
  }

  selectDown(): void {
    this.selectedIndex = Math.min(4, this.selectedIndex + 1);
    this.drawShop();
  }

  toggleMode(): void {
    this.mode = this.mode === 'buy' ? 'sell' : 'buy';
    this.drawShop();
  }

  buyItem(): boolean {
    const itemId = this.shop.ItemID?.[this.selectedIndex];
    if (!itemId) return false;
    // 检查金钱等...
    return true;
  }
}
