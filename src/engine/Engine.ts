import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

export class Engine {
  private static instance: Engine;
  static getInstance(): Engine { return Engine.instance; }

  app!: Application;
  sceneLayer!: Container;
  uiLayer!: Container;
  uiWidth = 1024;
  uiHeight = 640;
  private _ready = false;
  get ready(): boolean { return this._ready; }

  private constructor() { Engine.instance = this; }
  static create(): Engine { return new Engine(); }

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: 960,
      height: 640,
      backgroundColor: 0x000000,
      antialias: false,
    });
    container.appendChild(this.app.canvas!);

    this.sceneLayer = new Container();
    this.sceneLayer.label = 'scene';
    this.app.stage.addChild(this.sceneLayer);

    this.uiLayer = new Container();
    this.uiLayer.label = 'ui';
    this.app.stage.addChild(this.uiLayer);

    InputManager.getInstance().init(this.app.canvas as HTMLCanvasElement);
    AudioManager.getInstance().init();
    this._ready = true;
  }

  windowToUISpace(wx: number, wy: number): { ux: number; uy: number } {
    const rect = this.app.canvas!.getBoundingClientRect();
    return { ux: (wx - rect.left) * (this.uiWidth / rect.width), uy: (wy - rect.top) * (this.uiHeight / rect.height) };
  }

  fillRect(g: Graphics, color: number, x: number, y: number, w: number, h: number, alpha: number = 1): void {
    g.rect(x, y, w, h);
    g.fill({ color, alpha });
  }

  createText(content: string, fontSize: number, color: number | string = 0xffffff): Text {
    return new Text({
      text: content,
      style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize, fill: color },
    });
  }

  /** 切换场景：清除旧场景，添加新场景节点 */
  showScene(node: Container): void {
    this.sceneLayer.removeChildren();
    this.sceneLayer.addChild(node);
  }

  showUI(node: Container): void {
    this.uiLayer.removeChildren();
    this.uiLayer.addChild(node);
  }

  destroy(): void { this.app.destroy(true); }
}
