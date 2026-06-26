import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { ResourceTextureCache } from '../data/ResourceTextureCache';
import type { GameState, ItemSave } from '../data/Types';

/**
 * UIItem — 物品栏界面
 * 7×3 网格 + 分类标签
 * 对应 C++ UIItem.cpp
 */
export class UIItem extends RunNode {
  gameState!: GameState;
  private items: { item: ItemSave; count: number }[] = [];
  private activeCategory = 0; // 0全部 1药品 2暗器 3武器 4防具 5秘籍
  private categories = ['全部', '药品', '暗器', '武器', '防具', '秘籍'];
  private selectedIndex = -1;
  private detailText: Text;
  private readonly textureCache = ResourceTextureCache.getInstance();
  private lastIconReadyCount = -1;

  private cols = 7;
  private rows = 3;
  private cellW = 60;
  private cellH = 60;
  private startX = 20;
  private startY = 48;

  constructor() {
    super();
    this.label = 'UIItem';

    this.detailText = new Text({
      text: '',
      style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize: 14, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 600 },
    });
    this.detailText.x = 20;
    this.detailText.y = 270;
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
          this.textureCache.request('resource/item', item.ID);
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

    const engine = Engine.getInstance();
    const panel = new Graphics();
    panel.rect(8, 8, engine.uiWidth - 16, 330);
    panel.fill({ color: 0x000000, alpha: 0.72 });
    panel.rect(8, 8, engine.uiWidth - 16, 330);
    panel.stroke({ color: 0xd8d8d8, width: 1 });
    this.addChild(panel);

    this.addChild(this.detailText);

    const title = engine.createText('物品', 18, 0xffcc66);
    title.x = 20; title.y = 16;
    this.addChild(title);

    // 分类标签
    const catY = 20;
    this.categories.forEach((cat, i) => {
      const active = i === this.activeCategory;
      const t = engine.createText(cat, 14, active ? 0xffff66 : 0xb8b8b8);
      t.x = 86 + i * 70;
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
      g.rect(x, y, this.cellW, this.cellH);
      g.fill({ color: idx === this.selectedIndex ? 0x274675 : 0x101826, alpha: 0.92 });
      g.rect(x, y, this.cellW, this.cellH);
      g.stroke({ color: idx === this.selectedIndex ? 0xffff66 : 0xd0d0d0, width: 1 });
      this.addChild(g);

      const icon = this.textureCache.createSprite('resource/item', entry.item.ID, x + 30, y + 34, 1);
      if (icon) {
        icon.anchor.set(0.5);
        const maxSide = Math.max(icon.width, icon.height);
        if (maxSide > 34) icon.scale.set(icon.scale.x * (34 / maxSide));
        this.addChild(icon);
      }

      const name = engine.createText(entry.item.Name.substring(0, 4), 11, 0xffffff);
      name.x = x + 4;
      name.y = y + 4;
      this.addChild(name);

      const count = engine.createText(`×${entry.count}`, 11, 0xffee88);
      count.x = x + 5;
      count.y = y + 43;
      this.addChild(count);
    });

    // 选中物品详情
    if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
      const entry = this.items[this.selectedIndex];
      this.detailText.text = `${entry.item.Name}\n${entry.item.Introduction}\n价格: ${entry.item.Price}`;
    } else {
      this.detailText.text = 'Tab 分类　方向键选择　Enter/Space 返回';
    }
  }

  /** 选择物品 */
  selectItem(index: number): void {
    this.selectedIndex = index;
    this.drawGrid();
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const max = Math.min(this.items.length, this.cols * this.rows) - 1;
    const visibleItems = this.items.slice(0, this.cols * this.rows);
    visibleItems.forEach(entry => this.textureCache.request('resource/item', entry.item.ID));
    const readyCount = visibleItems.filter(entry => this.textureCache.getCached('resource/item', entry.item.ID)).length;
    if (readyCount !== this.lastIconReadyCount) {
      this.lastIconReadyCount = readyCount;
      this.drawGrid();
    }
    if (input.isKeyPressed('Tab')) {
      this.activeCategory = (this.activeCategory + 1) % this.categories.length;
      this.selectedIndex = -1;
      this.loadItems(this.gameState, this.gameState.SelfIndex);
    }
    if (max >= 0) {
      if (this.selectedIndex < 0) this.selectedIndex = 0;
      if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA')) this.selectItem(Math.max(0, this.selectedIndex - 1));
      if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD')) this.selectItem(Math.min(max, this.selectedIndex + 1));
      if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) this.selectItem(Math.max(0, this.selectedIndex - this.cols));
      if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) this.selectItem(Math.min(max, this.selectedIndex + this.cols));
    }
    if (input.isKeyPressed('Escape') || input.isKeyPressed('Enter') || input.isKeyPressed('Space')) this.exitWithResult(this.selectedIndex);
  }
}
