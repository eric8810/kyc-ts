import { Container, Graphics, Sprite } from 'pixi.js';
import { RunNode } from '../../core/RunNode';
import { Engine } from '../../engine/Engine';
import { Scene } from '../../core/Scene';

export const BATTLEMAP_COORD_COUNT = 64;

/**
 * BattleMap — 64x64 菱形战斗网格
 */
export class BattleMap extends RunNode {
  readonly mapW = 64;
  readonly mapH = 64;
  readonly tileW = 36;
  readonly tileH = 18;
  private groundLayer: number[][] = [];
  private buildingLayer: number[][] = [];

  constructor() {
    super();
    this.label = 'BattleMap';
    this.initLayers();
  }

  private initLayers(): void {
    for (let y = 0; y < this.mapH; y++) {
      this.groundLayer.push(new Array(this.mapW).fill(0));
      this.buildingLayer.push(new Array(this.mapW).fill(0));
    }
  }

  setGround(data: number[][]): void { this.groundLayer = data; }
  setBuilding(data: number[][]): void { this.buildingLayer = data; }

  /** 地图坐标 → 屏幕坐标 */
  mapToScreen(mx: number, my: number): { x: number; y: number } {
    return {
      x: (mx - my) * this.tileW / 2,
      y: (mx + my) * this.tileH / 2,
    };
  }

  /** 屏幕坐标 → 地图坐标 */
  screenToMap(sx: number, sy: number): { x: number; y: number } {
    const mx = (sx / (this.tileW / 2) + sy / (this.tileH / 2)) / 2;
    const my = (sy / (this.tileH / 2) - sx / (this.tileW / 2)) / 2;
    return { x: Math.floor(mx), y: Math.floor(my) };
  }

  /** 检查位置是否可行走 */
  canWalk(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) return false;
    return this.buildingLayer[y]?.[x] === 0;
  }

  drawBattleMap(cameraX: number, cameraY: number, container: Container): void {
    container.removeChildren();
    const startM = Math.max(0, Math.floor(cameraX / this.tileW) - 2);
    const endM = Math.min(this.mapW, Math.floor((cameraX + 1024) / this.tileW) + 2);
    const startN = Math.max(0, Math.floor(cameraY / this.tileH) - 2);
    const endN = Math.min(this.mapH, Math.floor((cameraY + 640) / this.tileH) + 2);

    for (let y = startN; y < endN; y++) {
      for (let x = startM; x < endM; x++) {
        const pos = this.mapToScreen(x, y);
        const g = new Graphics();
        g.moveTo(pos.x - cameraX, pos.y - cameraY);
        // 菱形 tile
        g.poly([
          this.tileW / 2, 0,
          this.tileW, this.tileH / 2,
          this.tileW / 2, this.tileH,
          0, this.tileH / 2,
        ]);
        g.fill({ color: this.groundLayer[y]?.[x] ? 0x446644 : 0x334433, alpha: 0.5 });
        g.stroke({ color: 0x225522, width: 0.5 });
        container.addChild(g);
      }
    }
  }
}
