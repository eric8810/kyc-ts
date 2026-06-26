import { Graphics, Sprite } from 'pixi.js';
import { RunNode } from '../../core/RunNode';
import { Engine } from '../../engine/Engine';
import { InputManager } from '../../engine/InputManager';
import type { BattleScene } from './BattleScene';

export enum CursorMode {
  None = -1,
  Move = 0,
  Action = 1,
  Check = 2,
  Line = 3,
  Self = 4,
  View = 5,
}

/**
 * BattleCursor — 战斗光标
 */
export class BattleCursor extends RunNode {
  mode: CursorMode = CursorMode.Move;
  gridX = 0;
  gridY = 0;

  private scene: BattleScene;
  private cursorGraphics: Graphics;
  private selectLayer: number[];

  constructor(scene: BattleScene) {
    super();
    this.scene = scene;
    this.label = 'BattleCursor';

    this.cursorGraphics = new Graphics();
    this.addChild(this.cursorGraphics);
    this.selectLayer = new Array(64 * 64).fill(0);
  }

  setSelectLayer(layer: number[]): void {
    this.selectLayer = layer;
  }

  setPosition45(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
  }

  isSelectable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= 64 || y >= 64) return false;
    return this.selectLayer[y * 64 + x] > 0;
  }

  findNearestSelectable(fromX: number, fromY: number): [number, number] {
    let bestX = -1, bestY = -1, bestDist = Infinity;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (this.isSelectable(x, y)) {
          const d = Math.abs(x - fromX) + Math.abs(y - fromY);
          if (d < bestDist) { bestDist = d; bestX = x; bestY = y; }
        }
      }
    }
    return [bestX, bestY];
  }

  move(dx: number, dy: number): void {
    const nx = this.gridX + dx;
    const ny = this.gridY + dy;
    if (this.mode === CursorMode.Line) {
      let cx = this.gridX, cy = this.gridY;
      while (true) {
        cx += dx; cy += dy;
        if (this.isSelectable(cx, cy)) continue;
        cx -= dx; cy -= dy;
        if (cx === this.gridX && cy === this.gridY) break;
        this.gridX = cx; this.gridY = cy;
        break;
      }
    } else {
      if (this.isSelectable(nx, ny)) { this.gridX = nx; this.gridY = ny; }
    }
  }

  confirm(): [number, number] {
    return [this.gridX, this.gridY];
  }

  moveToMouse(): void {
    const input = InputManager.getInstance();
    const engine = Engine.getInstance();
    const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
    const [mx, my] = this.pixelTo45(ux, uy);
    if (this.isSelectable(mx, my)) { this.gridX = mx; this.gridY = my; }
  }

  private pixelTo45(px: number, py: number): [number, number] {
    const tileW = this.scene.TILE_W;
    const tileH = this.scene.TILE_H;
    const x = Math.round(((px - 64 * tileW) / tileW + py / tileH) / 2);
    const y = Math.round((-(px - 64 * tileW) / tileW + py / tileH) / 2);
    return [x, y];
  }

  override draw(): void {
    this.cursorGraphics.clear();
    if (this.mode === CursorMode.None) return;

    const tileW: number = this.scene.TILE_W;
    const tileH: number = this.scene.TILE_H;

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (this.selectLayer[y * 64 + x] <= 0) continue;
        const px = (x - y) * tileW / 2 + Engine.getInstance().uiWidth / 2;
        const py = (x + y) * tileH / 2 + 40;

        let color = 0x00ff00;
        if (this.mode === CursorMode.Move) color = 0x0088ff;
        else if (this.mode === CursorMode.Action) color = 0xff4400;
        else if (this.mode === CursorMode.Check) color = 0xffff00;

        const alpha = (x === this.gridX && y === this.gridY) ? 0.6 : 0.2;
        this.cursorGraphics.rect(px - tileW / 2 + 1, py - tileH / 2 + 1, tileW - 2, tileH - 2);
        this.cursorGraphics.fill({ color, alpha });
      }
    }

    const cx = (this.gridX - this.gridY) * tileW / 2 + Engine.getInstance().uiWidth / 2;
    const cy = (this.gridX + this.gridY) * tileH / 2 + 40;
    this.cursorGraphics.rect(cx - tileW / 2, cy - tileH / 2, tileW, tileH);
    this.cursorGraphics.stroke({ color: 0xffffff, width: 2 });
  }
}
