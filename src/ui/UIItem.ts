import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { TextureManager } from '../data/TextureManager';
import type { GameState, ItemSave } from '../data/Types';

/**
 * UIItem — 物品栏界面
 * 7×3 网格 + 拖拽 + 分类标签
 * 对应 C++ UIItem.cpp
 */
export class UIItem extends RunNode {
  gameState!: GameState;
  private items: { item: ItemSave; count: number }[] = [];
  private activeCategory = 0; // 0全部 1药品 2暗器 3武器 4防具 5秘籍
  private categories = ['全部', '药品', '暗器', '武器', '防具', '秘籍'];
  private selectedIndex = -1;
  private detailText: Text;

  private cols = 7;
  private rows = 3;
  private cellW = 60;
  private cellH = 60;
  private startX = 20;
  private startY = 40;

  constructor() {
    super();
    this.label = 'UIItem';

    this.detailText = new Text({
      text: '',
      style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize: 14, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 600 },
    });
    this.detailText.x = 20;
    this.detailText.y = 260;
    this.addChild(this.detailText);
  }

  /** 加载玩家物品 */
  loadItems(state: GameState, selfIndex: number): void {
    this.gameState = state;
    const role = state.Roles[selfIndex];
    this.items = [];

    for (let i = 0; i < role.Item.length; i++) {
      const itemId = role.Item[i];
      const count = role.ItemCount[i] || 0;
      if (itemId > 0 && itemId < state.Items.length && count > 0) {
        const item = state.Items[itemId];
        if (this.filterItem(item)) {
          this.items.push({ item, count });
        }
      }
    }
    this.drawGrid();
  }

  private filterItem(item: ItemSave): boolean {
    if (this.activeCategory === 0) return true;
    if (this.activeCategory === 1) return item.ItemType === 0; // 药品
    if (this.activeCategory === 2) return item.ItemType === 1; // 暗器
    if (this.activeCategory === 3) return item.ItemType === 2; // 武器
    if (this.activeCategory === 4) return item.ItemType === 3; // 防具
    if (this.activeCategory === 5) return item.ItemType === 4; // 秘籍
    return true;
  }

  private drawGrid(): void {
    this.removeChildren();
    this.addChild(this.detailText);

    const engine = Engine.getInstance();

    // 分类标签
    const catY = 5;
    this.categories.forEach((cat, i) => {
      const active = i === this.activeCategory;
      const t = engine.createText(cat, 14, active ? 0xffcc66 : 0x8888aa);
      t.x = this.startX + i * 70;
      t.y = catY;
      this.addChild(t);
    });

    // 物品格子
    this.items.forEach((entry, idx) => {
      const col = idx % this.cols;
      const row = Math.floor(idx / this.cols);
      if (row >= this.rows) return;

      const x = this.startX + col * (this.cellW + 4);
      const y = this.startY + row * (this.cellH + 4);

      const g = new Graphics();
      g.roundRect(x, y, this.cellW, this.cellH, 4);
      g.fill({ color: idx === this.selectedIndex ? 0x3a3a5a : 0x1a1a2e });
      g.roundRect(x, y, this.cellW, this.cellH, 4);
      g.stroke({ color: 0x444466, width: 1 });
      this.addChild(g);

      const name = engine.createText(entry.item.Name.substring(0, 3), 12, 0xffffff);
      name.x = x + 5;
      name.y = y + 5;
      this.addChild(name);

      const count = engine.createText(`×${entry.count}`, 11, 0x88aacc);
      count.x = x + 5;
      count.y = y + 40;
      this.addChild(count);
    });

    // 选中物品详情
    if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
      const entry = this.items[this.selectedIndex];
      this.detailText.text = `${entry.item.Name}\n${entry.item.Introduction}\n价格: ${entry.item.Price}`;
    }
  }

  /** 选择物品 */
  selectItem(index: number): void {
    this.selectedIndex = index;
    this.drawGrid();
  }
}
