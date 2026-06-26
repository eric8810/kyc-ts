import { Container, Graphics } from 'pixi.js';
import { RunNode } from '../../core/RunNode';
import { Engine } from '../../engine/Engine';
import { ResourceTextureCache } from '../../data/ResourceTextureCache';

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
  private readonly textureCache = ResourceTextureCache.getInstance();

  constructor() {
    super();
    this.label = 'BattleMap';
    this.initLayers();
  }

  private initLayers(): void {
    for (let y = 0; y < this.mapH; y++) {
      const ground: number[] = [];
      const building: number[] = [];
      for (let x = 0; x < this.mapW; x++) {
        ground.push((x + y) % 6 === 0 ? 10 : 0);
        building.push(0);
      }
      this.groundLayer.push(ground);
      this.buildingLayer.push(building);
    }

    // 少量障碍，提供更接近原版战场的地形层次，而不是纯半透明网格。
    for (let x = 24; x <= 38; x++) this.buildingLayer[26][x] = 1001 + (x % 4);
    for (let y = 30; y <= 36; y++) this.buildingLayer[y][34] = 1021 + (y % 4);
  }

  setGround(data: number[][]): void { this.groundLayer = data; }
  setBuilding(data: number[][]): void { this.buildingLayer = data; }

  /** 地图坐标 → 屏幕坐标 */
  mapToScreen(mx: number, my: number): { x: number; y: number } {
    const offsetX = Engine.getInstance().uiWidth / 2;
    const offsetY = 40;
    return {
      x: (mx - my) * this.tileW / 2 + offsetX,
      y: (mx + my) * this.tileH / 2 + offsetY,
    };
  }

  /** 屏幕坐标 → 地图坐标 */
  screenToMap(sx: number, sy: number): { x: number; y: number } {
    const offsetX = Engine.getInstance().uiWidth / 2;
    const offsetY = 40;
    const x = sx - offsetX;
    const y = sy - offsetY;
    const mx = (x / (this.tileW / 2) + y / (this.tileH / 2)) / 2;
    const my = (y / (this.tileH / 2) - x / (this.tileW / 2)) / 2;
    return { x: Math.floor(mx), y: Math.floor(my) };
  }

  /** 检查位置是否可行走 */
  canWalk(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) return false;
    return this.buildingLayer[y]?.[x] === 0;
  }

  drawBattleMap(cameraX: number, cameraY: number, container: Container): void {
    container.removeChildren();
    const fallback = new Graphics();
    const objects: { z: number; node: any }[] = [];

    fallback.rect(0, 0, Engine.getInstance().uiWidth, Engine.getInstance().uiHeight);
    fallback.fill({ color: 0x050505 });

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const pos = this.mapToScreen(x, y);
        const sx = pos.x - cameraX;
        const sy = pos.y - cameraY;
        if (sx < -160 || sx > Engine.getInstance().uiWidth + 160 ||
            sy < -180 || sy > Engine.getInstance().uiHeight + 120) continue;

        const ground = this.groundLayer[y]?.[x] ?? 0;
        const groundSprite = this.textureCache.createSprite('resource/smap', ground, sx, sy);
        if (groundSprite) container.addChild(groundSprite);
        else {
          fallback.poly([
            sx, sy - 17,
            sx + this.tileW / 2, sy - 8,
            sx, sy + 1,
            sx - this.tileW / 2, sy - 8,
          ]);
          fallback.fill({ color: ground ? 0x4f5a3a : 0x35432f, alpha: 0.9 });
        }

        const building = this.buildingLayer[y]?.[x] ?? 0;
        if (building > 0) {
          const sprite = this.textureCache.createSprite('resource/smap', building, sx, sy);
          if (sprite) objects.push({ z: (x + y) * 1024 + x, node: sprite });
        }
      }
    }

    container.addChildAt(fallback, 0);
    objects.sort((a, b) => a.z - b.z);
    for (const obj of objects) container.addChild(obj.node);
  }
}
