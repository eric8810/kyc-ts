import { Graphics } from 'pixi.js';
import { Scene } from '../core/Scene';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { AssetLoader } from '../engine/AssetLoader';
import { ResourceTextureCache } from '../data/ResourceTextureCache';
import type { GameState } from '../data/Types';

/**
 * MainScene — 大地图场景（480×480 等距瓦片）
 */
export class MainScene extends Scene {
  private gameState!: GameState;

  /** 地图尺寸 */
  private mapW = 480;
  private mapH = 480;

  /** 地图数据（资源中的 .002 值需 /2 后才是 mmap 贴图编号） */
  private earthData: number[][] = [];
  private surfaceData: number[][] = [];
  private buildingData: number[][] = [];
  private buildXData: number[][] = [];
  private buildYData: number[][] = [];
  private readonly textureCache = ResourceTextureCache.getInstance();
  private readonly texturePath = 'resource/mmap';

  constructor() {
    super();
    this.label = 'MainScene';
    this.COORD_COUNT = 480;
  }

  async init(gameState: GameState): Promise<void> {
    this.gameState = gameState;
    this.mapW = 480;
    this.mapH = 480;

    const loadedOriginalMap = await this.tryLoadOriginalMap();
    if (!loadedOriginalMap) {
      if (gameState.MainMap?.earth?.length > 0) {
        this.earthData = gameState.MainMap.earth;
        this.surfaceData = gameState.MainMap.surface;
        this.buildingData = gameState.MainMap.building;
      } else {
        this.generateDemoMap();
      }
      this.buildXData = [];
      this.buildYData = [];
    }

    // 设置主角位置。DBReader 当前默认坐标可能落在原版建筑图块上；原版初始大地图坐标来自 base 表，约为 357,235。
    const role = gameState.Roles[gameState.SelfIndex];
    const fallback = { x: 357, y: 235 };
    if (role) {
      const sx = role.X > 0 ? role.X : fallback.x;
      const sy = role.Y > 0 ? role.Y : fallback.y;
      if (this.canWalk(sx, sy)) {
        this.manX = sx;
        this.manY = sy;
      } else {
        this.manX = fallback.x;
        this.manY = fallback.y;
      }
      role.X = this.manX;
      role.Y = this.manY;
    } else {
      this.manX = fallback.x;
      this.manY = fallback.y;
    }

    this.calViewRegion();
    this.camera.followIso(this.manX, this.manY, this.TILE_W, this.TILE_H, Engine.getInstance().uiWidth, Engine.getInstance().uiHeight);
    this.preloadAroundPlayer();
  }

  private async tryLoadOriginalMap(): Promise<boolean> {
    const loader = AssetLoader.getInstance();
    try {
      const [earth, surface, building, buildX, buildY] = await Promise.all([
        loader.loadBinary('resource/earth.002'),
        loader.loadBinary('resource/surface.002'),
        loader.loadBinary('resource/building.002'),
        loader.loadBinary('resource/buildx.002'),
        loader.loadBinary('resource/buildy.002'),
      ]);
      this.earthData = this.parseLayer(earth, true);
      this.surfaceData = this.parseLayer(surface, true);
      this.buildingData = this.parseLayer(building, true);
      this.buildXData = this.parseLayer(buildX, false);
      this.buildYData = this.parseLayer(buildY, false);
      console.log('[MainScene] 原版大地图 .002 图层加载完成');
      return true;
    } catch (e) {
      console.warn('[MainScene] 原版大地图加载失败，使用演示地图', e);
      return false;
    }
  }

  private parseLayer(buffer: ArrayBuffer, divide2: boolean): number[][] {
    const view = new DataView(buffer);
    const rows: number[][] = [];
    for (let y = 0; y < this.mapH; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.mapW; x++) {
        const raw = view.getInt16((y * this.mapW + x) * 2, true);
        row.push(divide2 ? Math.trunc(raw / 2) : raw);
      }
      rows.push(row);
    }
    return rows;
  }

  private generateDemoMap(): void {
    this.mapW = 480; this.mapH = 480;
    this.earthData = [];
    this.surfaceData = [];
    this.buildingData = [];

    for (let y = 0; y < this.mapH; y++) {
      const earthRow: number[] = [];
      const surfRow: number[] = [];
      const buildRow: number[] = [];
      for (let x = 0; x < this.mapW; x++) {
        earthRow.push(1 + (x + y) % 10);
        surfRow.push((x + y) % 7 === 0 ? 1 : 0);
        buildRow.push(0);
      }
      this.earthData.push(earthRow);
      this.surfaceData.push(surfRow);
      this.buildingData.push(buildRow);
    }
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const engine = Engine.getInstance();

    // 方向键行走
    const { dx, dy } = input.direction;
    if (dx !== 0 || dy !== 0) {
      const nx = this.manX + dx;
      const ny = this.manY + dy;
      if (this.canWalk(nx, ny)) {
        this.manX = nx;
        this.manY = ny;
        this.step = (this.step + 1) % 7;
        this.changeTowardsByKey(
          dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp'
        );
        this.syncRolePosition();
      }
    }

    // 鼠标点击行走
    if (input.state.mouseJustPressed) {
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const target = this.getMousePositionIso(ux, uy, this.camera.x, this.camera.y);
      if (target.x >= 0 && target.y >= 0 && target.x < this.mapW && target.y < this.mapH) {
        this.FindWay(this.manX, this.manY, target.x, target.y);
      }
    }

    // A* 路径行走
    if (this.walkStep()) {
      this.step = (this.step + 1) % 7;
      this.syncRolePosition();
    }

    // 入口检测
    this.checkEntrance();

    // 相机跟随
    this.camera.followIso(this.manX, this.manY, this.TILE_W, this.TILE_H, engine.uiWidth, engine.uiHeight);
    this.preloadAroundPlayer();

    // ESC 打开系统菜单。返回负数避免被误判为子场景编号；主循环处理后回到大地图。
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(-12);
    }
  }

  private syncRolePosition(): void {
    const role = this.gameState.Roles[this.gameState.SelfIndex];
    if (role) {
      role.X = this.manX;
      role.Y = this.manY;
      role.Face = this.towards;
    }
  }

  override canWalk(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    const bx = this.buildXData[y]?.[x] ?? x;
    const by = this.buildYData[y]?.[x] ?? y;
    const b = this.buildingData[by]?.[bx] ?? this.buildingData[y]?.[x] ?? 0;
    return b <= 0;
  }

  override isOutScreen(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.mapW || y >= this.mapH;
  }

  /** 检查场景入口 */
  private checkEntrance(): void {
    // 先保留测试入口，确保子场景功能可由大地图实际触发；后续接入 submap 表后替换为真实入口。
    const entrances = [
      { x: 200, y: 200, subMapId: 1 },
      { x: 250, y: 250, subMapId: 2 },
    ];

    for (const e of entrances) {
      if (this.manX === e.x && this.manY === e.y && !this._exit) {
        this.enterSubScene(e.subMapId);
      }
    }
  }

  private async enterSubScene(subMapId: number): Promise<void> {
    console.log(`[MainScene] 进入场景 ${subMapId}`);
    this.exitWithResult(subMapId);
  }

  private drawFallbackTile(g: Graphics, px: number, py: number, color: number, alpha = 1): void {
    g.poly([
      px, py - 17,
      px + this.TILE_W, py - 8,
      px, py + 1,
      px - this.TILE_W, py - 8,
    ]);
    g.fill({ color, alpha });
  }

  private preloadAroundPlayer(): void {
    const ids = new Set<number>();
    const range = 12;
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const x = this.manX + dx;
        const y = this.manY + dy;
        if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) continue;
        const e = this.earthData[y]?.[x] ?? 0;
        const s = this.surfaceData[y]?.[x] ?? 0;
        const b = this.buildingData[y]?.[x] ?? 0;
        if (e > 0) ids.add(e);
        if (s > 0) ids.add(s);
        if (b > 0) ids.add(b);
      }
    }
    for (let i = 0; i < 28; i++) ids.add(2501 + i);
    void this.textureCache.preload(this.texturePath, ids);
  }

  override draw(): void {
    this.beginDrawScene();
    const engine = Engine.getInstance();
    const fallback = new Graphics();
    const objects: { z: number; node: any }[] = [];

    fallback.rect(0, 0, engine.uiWidth, engine.uiHeight);
    fallback.fill({ color: 0x000000 });

    const viewCX = -this.camera.x;
    const viewCY = -this.camera.y;
    const viewWidth = Math.ceil(engine.uiWidth / this.TILE_W / 2) + 4;
    const viewSum = Math.ceil(engine.uiHeight / this.TILE_H) + 8;

    for (let sum = -viewSum; sum <= viewSum + 15; sum++) {
      for (let i = -viewWidth; i <= viewWidth; i++) {
        const half = Math.trunc(sum / 2);
        const mx = this.manX + i + half;
        const my = this.manY - i + (sum - half);
        if (mx < 0 || my < 0 || mx >= this.mapW || my >= this.mapH) continue;

        const px = viewCX + (mx - my) * this.TILE_W;
        const py = viewCY + (mx + my) * this.TILE_H;
        if (px < -160 || px > engine.uiWidth + 160 || py < -220 || py > engine.uiHeight + 120) continue;

        const earthTile = this.earthData[my]?.[mx] ?? 0;
        if (earthTile > 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, earthTile, px, py);
          if (sprite) this.sceneContainer.addChild(sprite);
          else this.drawFallbackTile(fallback, px, py, 0x2f6d35 + (earthTile % 12) * 0x030303, 0.9);
        }

        const surfaceTile = this.surfaceData[my]?.[mx] ?? 0;
        if (surfaceTile > 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, surfaceTile, px, py);
          if (sprite) this.sceneContainer.addChild(sprite);
          else this.drawFallbackTile(fallback, px, py, 0x4d8a3a, 0.45);
        }

        const buildingTile = this.buildingData[my]?.[mx] ?? 0;
        if (buildingTile > 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, buildingTile, px, py);
          if (sprite) objects.push({ z: ((mx + my) * 1024 + mx) * 2 + 1, node: sprite });
          else this.drawFallbackTile(fallback, px, py - this.TILE_H, 0x806236, 0.75);
        }

        if (mx === this.manX && my === this.manY) {
          const manPic = 2501 + this.towards * 7 + (this.step % 7);
          const sprite = this.textureCache.createSprite(this.texturePath, manPic, px, py);
          if (sprite) objects.push({ z: ((mx + my) * 1024 + mx) * 2, node: sprite });
          else {
            fallback.circle(px, py - 18, 7);
            fallback.fill({ color: 0x4aa3ff });
            fallback.circle(px, py - 18, 7);
            fallback.stroke({ color: 0xffffff, width: 1 });
          }
        }
      }
    }

    this.sceneContainer.addChildAt(fallback, 0);
    objects.sort((a, b) => a.z - b.z);
    for (const obj of objects) this.sceneContainer.addChild(obj.node);
    this.endDrawScene();
  }
}
