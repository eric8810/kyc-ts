import { Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { ParticleSystem } from '../effects/ParticleSystem';
import type { GameState } from '../data/Types';
import { SaveManager } from '../data/SaveManager';
import { ResourceTextureCache } from '../data/ResourceTextureCache';

/**
 * TitleScene — 标题画面
 */
export class TitleScene extends RunNode {
  private gameState!: GameState;
  private menuIndex = 0;
  private menuItems = ['新游戏', '读取进度', '子场景测试', '战斗测试', '系统菜单', '退出游戏'];
  private titleText: Text | null = null;
  private flameParticles: ParticleSystem | null = null;
  private bg: Graphics | null = null;
  private titleSprite: Sprite | null = null;
  private readonly textureCache = ResourceTextureCache.getInstance();

  constructor() {
    super();
    this.label = 'TitleScene';
    this._fullWindow = 1;
  }

  setGameState(state: GameState): void { this.gameState = state; }

  override onEntrance(): void {
    const engine = Engine.getInstance();
    this.textureCache.request('resource/title', 154);
    this.textureCache.request('resource/title', 153);

    this.bg = new Graphics();
    this.addChild(this.bg);
    this.drawBackground();

    // 标题文字：真实资源加载前/加载失败时作为 fallback；加载后保留小标题增强可读性。
    this.titleText = new Text({
      text: '金庸群侠传',
      style: new TextStyle({
        fontFamily: 'SimHei, Microsoft YaHei, serif',
        fontSize: 56,
        fill: 0xffcc00,
        stroke: { color: 0x2c1600, width: 3 },
        dropShadow: { color: 0x000000, blur: 4, distance: 2 },
      }),
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = engine.uiWidth / 2;
    this.titleText.y = 92;
    this.addChild(this.titleText);

    const sub = new Text({
      text: 'Web 复刻调试版',
      style: new TextStyle({ fontFamily: 'SimHei, serif', fontSize: 16, fill: 0xd0d0d0 }),
    });
    sub.anchor.set(0.5);
    sub.x = engine.uiWidth / 2;
    sub.y = 132;
    this.addChild(sub);

    this.drawMenu();
    this.flameParticles = ParticleSystem.createFire(engine.uiWidth / 2, engine.uiHeight - 50);
  }

  private drawBackground(): void {
    const engine = Engine.getInstance();
    if (this.bg) {
      this.bg.clear();
      this.bg.rect(0, 0, engine.uiWidth, engine.uiHeight);
      this.bg.fill({ color: 0x050506 });
      // 原版/CPP 标题图是深色整屏图；资源未就绪时用低饱和像素风底纹，不再是纯现代渐变。
      for (let y = 0; y < engine.uiHeight; y += 36) {
        this.bg.rect(0, y, engine.uiWidth, 18);
        this.bg.fill({ color: y % 72 === 0 ? 0x101018 : 0x08080f, alpha: 0.9 });
      }
    }

    const cached = this.textureCache.getCached('resource/title', 154) ?? this.textureCache.getCached('resource/title', 153);
    if (cached && !this.titleSprite) {
      this.titleSprite = new Sprite(cached.texture);
      const scale = Math.max(engine.uiWidth / cached.width, engine.uiHeight / cached.height);
      this.titleSprite.scale.set(scale);
      this.titleSprite.x = (engine.uiWidth - cached.width * scale) / 2;
      this.titleSprite.y = (engine.uiHeight - cached.height * scale) / 2;
      this.addChildAt(this.titleSprite, 1);
    }
  }

  private drawMenu(): void {
    const engine = Engine.getInstance();
    const startY = 292;

    this.drawBackground();

    // 清除旧菜单
    for (const c of this.children.slice()) {
      if (c.label === 'menu-item' || c.label === 'menu-box') this.removeChild(c);
    }

    const box = new Graphics();
    box.label = 'menu-box';
    box.rect(engine.uiWidth / 2 - 112, startY - 20, 224, this.menuItems.length * 38 + 36);
    box.fill({ color: 0x000000, alpha: 0.68 });
    box.rect(engine.uiWidth / 2 - 112, startY - 20, 224, this.menuItems.length * 38 + 36);
    box.stroke({ color: 0xd8d8d8, width: 1 });
    this.addChild(box);

    for (let i = 0; i < this.menuItems.length; i++) {
      if (i === this.menuIndex) {
        const hl = new Graphics();
        hl.label = 'menu-item';
        hl.rect(engine.uiWidth / 2 - 92, startY + i * 38 - 3, 184, 28);
        hl.fill({ color: 0x264a83, alpha: 0.72 });
        this.addChild(hl);
      }

      const color = i === this.menuIndex ? 0xffff66 : 0xe0e0e0;
      const text = new Text({
        text: `${i === this.menuIndex ? '▶ ' : '　'}${this.menuItems[i]}`,
        style: new TextStyle({ fontFamily: 'SimHei, Microsoft YaHei, serif', fontSize: 22, fill: color }),
      });
      text.anchor.set(0.5);
      text.x = engine.uiWidth / 2;
      text.y = startY + i * 38 + 12;
      text.label = 'menu-item';
      this.addChild(text);
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    this.drawBackground();

    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) {
      this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.drawMenu();
    }
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
      this.menuIndex = (this.menuIndex + 1) % this.menuItems.length;
      this.drawMenu();
    }
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
      this.executeMenu();
    }
    if (input.state.mouseJustPressed) {
      const engine = Engine.getInstance();
      const { uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const startY = 292;
      for (let i = 0; i < this.menuItems.length; i++) {
        if (uy > startY + i * 38 - 14 && uy < startY + i * 38 + 24) {
          this.menuIndex = i;
          this.drawMenu();
          this.executeMenu();
          break;
        }
      }
    }
  }

  private async executeMenu(): Promise<void> {
    switch (this.menuIndex) {
      case 0: // 新游戏
        await this.startNewGame();
        break;
      case 1: // 读取进度
        this.exitWithResult(14);
        break;
      case 2: // 子场景测试
        this.exitWithResult(13);
        break;
      case 3: // 战斗测试
        this.exitWithResult(11);
        break;
      case 4: // 系统菜单
        this.exitWithResult(12);
        break;
      case 5: // 退出
        this.exitWithResult(-1);
        break;
    }
  }

  private async startNewGame(): Promise<void> {
    console.log('[KYS] 新游戏');
    this.exitWithResult(10);  // 新游戏
  }

  private async loadGame(): Promise<void> {
    const saveManager = SaveManager.getInstance();
    try {
      const state = await saveManager.loadGame(0);
      if (state) {
        this.gameState = state;
        console.log('[KYS] 存档加载成功');
        await this.startNewGame();
      }
    } catch {
      console.warn('[KYS] 无可用存档');
    }
  }

  override onExit(): void {
    if (this.flameParticles) {
      this.flameParticles.stop();
    }
  }
}
