import { Graphics, Container } from 'pixi.js';
import { Scene } from '../core/Scene';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { AssetLoader } from '../engine/AssetLoader';
import { TextureManager } from '../data/TextureManager';
import type { GameState } from '../data/Types';
import { SubScene } from './SubScene';

/**
 * MainScene — 大地图场景（480×480 菱形瓦片）
 */
export class MainScene extends Scene {
  private gameState!: GameState;

  /** 地图尺寸 */
  private mapW = 480;
  private mapH = 480;

  /** 地图数据 */
  private earthData: number[][] = [];
  private surfaceData: number[][] = [];
  private buildingData: number[][] = [];

  constructor() {
    super();
    this.label = 'MainScene';
  }

  async init(gameState: GameState): Promise<void> {
    this.gameState = gameState;

    if (gameState.MainMap?.earth?.length > 0) {
      this.earthData = gameState.MainMap.earth;
      this.surfaceData = gameState.MainMap.surface;
      this.buildingData = gameState.MainMap.building;
    } else {
      // 生成演示地图
      this.generateDemoMap();
    }

    this.calViewRegion();

    // 设置主角位置
    const role = gameState.Roles[gameState.SelfIndex];
    if (role) {
      this.manX = role.X || 200;
      this.manY = role.Y || 200;
    }
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
        this.changeTowardsByKey(
          dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp'
        );
      }
    }

    // 鼠标点击行走
    if (input.state.mouseJustPressed) {
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const target = this.getMouseMapPosition(this.camera.x, this.camera.y);
      if (target.x >= 0 && target.y >= 0 && target.x < this.mapW && target.y < this.mapH) {
        this.FindWay(this.manX, this.manY, target.x, target.y);
      }
    }

    // A* 路径行走
    this.walkStep();

    // 入口检测
    this.checkEntrance();

    // 相机跟随
    this.camera.follow(this.manX, this.manY, this.TILE_W, this.TILE_H, engine.uiWidth, engine.uiHeight);

    // ESC 菜单
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(0);
    }
  }

  override canWalk(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    const b = this.buildingData[y]?.[x] ?? 0;
    return b <= 0;
  }

  override isOutScreen(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.mapW || y >= this.mapH;
  }

  /** 检查场景入口 */
  private checkEntrance(): void {
    // 简化：某些坐标触发场景切换
    const entrances = [
      { x: 200, y: 200, subMapId: 1 },
      { x: 250, y: 250, subMapId: 2 },
    ];

    for (const e of entrances) {
      if (this.manX === e.x && this.manY === e.y) {
        this.enterSubScene(e.subMapId);
      }
    }
  }

  private async enterSubScene(subMapId: number): Promise<void> {
    console.log(`[MainScene] 进入场景 ${subMapId}`);
    const subScene = new SubScene();
    await subScene.init(this.gameState, subMapId);
    await subScene.run(true);
  }

  override draw(): void {
    this.beginDrawScene();
    const g = new Graphics();
    const viewCX = -this.camera.x + Engine.getInstance().uiWidth / 2;
    const viewCY = -this.camera.y + Engine.getInstance().uiHeight / 2;

    // 绘制可见区域的地图瓦片
    const viewRange = 20;
    for (let dy = -viewRange; dy <= viewRange; dy++) {
      for (let dx = -viewRange; dx <= viewRange; dx++) {
        const mx = this.manX + dx;
        const my = this.manY + dy;
        if (mx < 0 || my < 0 || mx >= this.mapW || my >= this.mapH) continue;

        const px = viewCX + (mx - my) * this.TILE_W / 2;
        const py = viewCY + (mx + my) * this.TILE_H / 2;

        // 屏幕外裁剪
        if (px < -this.TILE_W || px > Engine.getInstance().uiWidth ||
            py < -this.TILE_H || py > Engine.getInstance().uiHeight) continue;

        // 地面
        const earthTile = this.earthData[my][mx];
        g.rect(px - this.TILE_W / 2, py - this.TILE_H / 2, this.TILE_W, this.TILE_H);
        g.fill({ color: 0x2a5a2a + earthTile * 0x010101, alpha: 1 });

        // 表面装饰
        if (this.surfaceData[my][mx] > 0) {
          g.rect(px - 6, py - this.TILE_H, 12, this.TILE_H);
          g.fill({ color: 0x3a7a3a });
        }

        // 建筑
        if (this.buildingData[my][mx] > 0) {
          g.rect(px - this.TILE_W / 2 + 2, py - this.TILE_H + 2, this.TILE_W - 4, this.TILE_H - 4);
          g.fill({ color: 0x8b6914 });
        }
      }
    }

    // 绘制主角
    const ppx = viewCX + (this.manX - this.manY) * this.TILE_W / 2;
    const ppy = viewCY + (this.manX + this.manY) * this.TILE_H / 2;
    g.circle(ppx, ppy, 8);
    g.fill({ color: 0x4488ff });
    g.circle(ppx, ppy, 8);
    g.stroke({ color: 0xffffff, width: 1 });

    this.addChild(g);
    this.endDrawScene();
  }
}
