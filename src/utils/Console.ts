import { Container, Graphics } from 'pixi.js';
import { Engine } from '../engine/Engine';

/**
 * Console — 调试控制台
 * 对应 C++ Console.cpp，开发调试用
 */
export class GameConsole {
  private static instance: GameConsole;
  static getInstance(): GameConsole {
    if (!GameConsole.instance) GameConsole.instance = new GameConsole();
    return GameConsole.instance;
  }

  private container: Container;
  private history: string[] = [];
  private maxHistory = 100;
  private visible = false;
  private inputText = '';

  private constructor() {
    this.container = new Container();
    this.container.visible = false;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.visible = this.visible;
  }

  log(message: string): void {
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.render();
  }

  clear(): void {
    this.history = [];
    this.render();
  }

  getContainer(): Container {
    return this.container;
  }

  private render(): void {
    // 简化：使用 console.log 输出到浏览器控制台
    if (this.visible) {
      console.log('[KYS Console]', ...this.history.slice(-5));
    }
  }
}
