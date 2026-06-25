import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { AudioManager } from '../engine/AudioManager';
import { ParticleSystem } from '../effects/ParticleSystem';
import { Weather } from '../effects/Weather';
import type { GameState } from '../data/Types';
import { SaveManager } from '../data/SaveManager';
import { DBReader } from '../data/DBReader';
import { MainScene } from './MainScene';

/**
 * TitleScene — 标题画面
 */
export class TitleScene extends RunNode {
  private gameState!: GameState;
  private menuIndex = 0;
  private menuItems = ['新游戏', '读取进度', '退出游戏'];
  private titleText: Text | null = null;
  private flameParticles: ParticleSystem | null = null;

  constructor() {
    super();
    this.label = 'TitleScene';
    this._fullWindow = 1;
  }

  setGameState(state: GameState): void { this.gameState = state; }

  override onEntrance(): void {
    const engine = Engine.getInstance();
    const g = new Graphics();

    // 背景
    g.rect(0, 0, engine.uiWidth, engine.uiHeight);
    g.fill({ color: 0x1a1a2e });
    this.addChild(g);

    // 标题文字
    this.titleText = new Text({
      text: '金庸群侠传',
      style: new TextStyle({
        fontFamily: 'SimHei, Microsoft YaHei, serif',
        fontSize: 64,
        fill: 0xffcc00,
        stroke: { color: 0x8b4513, width: 3 },
        dropShadow: { color: 0x000000, blur: 5, distance: 3 },
      }),
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = engine.uiWidth / 2;
    this.titleText.y = 150;
    this.addChild(this.titleText);

    // 副标题
    const sub = new Text({
      text: 'Web 复刻版 (PixiJS)',
      style: new TextStyle({ fontFamily: 'SimHei, serif', fontSize: 18, fill: 0x888888 }),
    });
    sub.anchor.set(0.5);
    sub.x = engine.uiWidth / 2;
    sub.y = 210;
    this.addChild(sub);

    // 菜单
    this.drawMenu();

    // 火焰粒子效果
    this.flameParticles = ParticleSystem.createFire(engine.uiWidth / 2, engine.uiHeight - 50);
  }

  private drawMenu(): void {
    const engine = Engine.getInstance();
    const startY = 320;

    // 清除旧菜单
    for (const c of this.children.slice()) {
      if (c.label === 'menu-item') this.removeChild(c);
    }

    for (let i = 0; i < this.menuItems.length; i++) {
      const color = i === this.menuIndex ? 0xffcc00 : 0xcccccc;
      const text = new Text({
        text: this.menuItems[i],
        style: new TextStyle({ fontFamily: 'SimHei, Microsoft YaHei, serif', fontSize: 28, fill: color }),
      });
      text.anchor.set(0.5);
      text.x = engine.uiWidth / 2;
      text.y = startY + i * 50;
      text.label = 'menu-item';
      this.addChild(text);
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();

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
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const startY = 320;
      for (let i = 0; i < this.menuItems.length; i++) {
        if (uy > startY + i * 50 - 20 && uy < startY + i * 50 + 20) {
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
        this.exitWithResult(11);  // 读档
        break;
      case 2: // 退出
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
