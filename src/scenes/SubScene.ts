import { Graphics } from 'pixi.js';
import { Scene } from '../core/Scene';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import type { GameState, SubMapInfoSave, SubMapEvent } from '../data/Types';

/**
 * SubScene — 室内/洞窟场景
 * 64×64 菱形网格，6层，含事件系统
 */
export class SubScene extends Scene {
  private gameState!: GameState;
  private subMapId = 0;
  private subMapInfo: SubMapInfoSave | null = null;
  private events: SubMapEvent[] = [];

  /** 地图数据 */
  private mapW = 64;
  private mapH = 64;
  private earthData: number[] = [];
  private surfaceData: number[] = [];
  private buildingData: number[] = [];
  private eventData: number[] = []; // 事件索引层

  constructor() {
    super();
    this.label = 'SubScene';
  }

  async init(gameState: GameState, subMapId: number): Promise<void> {
    this.gameState = gameState;
    this.subMapId = subMapId;

    // 加载子场景数据
    const info = gameState.SubMaps.find(s => s.ID === subMapId);
    if (info) {
      this.subMapInfo = info;
      this.events = gameState.SubMapEvents[subMapId] || [];
      this.earthData = info.EarthSurface || [];
      this.buildingData = new Array(this.mapW * this.mapH).fill(0);
      this.eventData = info.Events || new Array(this.mapW * this.mapH).fill(0);
    } else {
      // 演示场景
      this.earthData = new Array(this.mapW * this.mapH).fill(1);
      this.buildingData = new Array(this.mapW * this.mapH).fill(0);
      this.eventData = new Array(this.mapW * this.mapH).fill(0);
      // 添加墙壁
      for (let y = 0; y < this.mapH; y++) {
        for (let x = 0; x < this.mapW; x++) {
          if (x === 0 || y === 0 || x === this.mapW - 1 || y === this.mapH - 1) {
            this.buildingData[y * this.mapW + x] = 1;
          }
        }
      }
    }

    // 设置主角位置
    const role = gameState.Roles[gameState.SelfIndex];
    if (role) {
      this.manX = role.SubMapX || 30;
      this.manY = role.SubMapY || 30;
    }

    this.calViewRegion();
    console.log(`[SubScene] 进入场景 ${subMapId} (${this.events.length} 事件)`);
  }

  protected override canWalk(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    const b = this.buildingData[y * this.mapW + x];
    return b <= 0;
  }

  protected override isOutScreen(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.mapW || y >= this.mapH;
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

    // 鼠标点击
    if (input.state.mouseJustPressed) {
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const target = this.getMouseMapPosition(this.camera.x, this.camera.y);
      if (this.canWalk(target.x, target.y)) {
        this.FindWay(this.manX, this.manY, target.x, target.y);
      }
    }

    this.walkStep();

    // 经过事件检测
    this.checkPassEvent();

    // 主动事件（Space键）
    if (input.isKeyPressed('Space')) {
      this.checkActiveEvent();
    }

    // 场景出口
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(0);
    }

    this.camera.follow(this.manX, this.manY, this.TILE_W, this.TILE_H, engine.uiWidth, engine.uiHeight);
  }

  /** 经过事件：走到特定坐标自动触发 */
  private checkPassEvent(): void {
    const idx = this.manY * this.mapW + this.manX;
    const eventIdx = this.eventData[idx];
    if (eventIdx <= 0 || eventIdx > this.events.length) return;

    const event = this.events[eventIdx - 1];
    if (!event || event.Type !== 0) return; // Type 0 = 经过事件
    if (!event.Active) return;

    console.log(`[SubScene] 触发经过事件 ${event.ScriptID}`);
    event.Active = 0; // 标记为已触发
  }

  /** 主动事件：在指定坐标按 Space 触发 */
  private checkActiveEvent(): void {
    // 检查主角面前的格子
    const front = { x: this.manX, y: this.manY };
    Scene.getTowardsPosition(this.manX, this.manY, this.towards, front);

    const idx = front.y * this.mapW + front.x;
    const eventIdx = this.eventData[idx];
    if (eventIdx <= 0 || eventIdx > this.events.length) return;

    const event = this.events[eventIdx - 1];
    if (!event || event.Type !== 1) return; // Type 1 = 主动事件
    if (!event.Active) return;

    console.log(`[SubScene] 触发主动事件 ${event.ScriptID}`);
  }

  override draw(): void {
    this.beginDrawScene();
    const g = new Graphics();
    const viewCX = Engine.getInstance().uiWidth / 2 + this.TILE_W / 2;
    const viewCY = this.TILE_H;

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const px = viewCX + (x - y) * this.TILE_W / 2 - this.camera.x;
        const py = viewCY + (x + y) * this.TILE_H / 2 - this.camera.y;

        if (px < -this.TILE_W || px > Engine.getInstance().uiWidth + this.TILE_W ||
            py < -this.TILE_H || py > Engine.getInstance().uiHeight + this.TILE_H) continue;

        const idx = y * this.mapW + x;

        // 地面
        const tile = this.earthData[idx] || 1;
        g.rect(px - this.TILE_W / 2, py - this.TILE_H / 2, this.TILE_W, this.TILE_H);
        g.fill({ color: 0x3a5a3a + tile * 0x020202, alpha: 1 });

        // 建筑
        if (this.buildingData[idx] > 0) {
          g.rect(px - this.TILE_W / 2 + 1, py - this.TILE_H + 1, this.TILE_W - 2, this.TILE_H - 2);
          g.fill({ color: 0x6a4a2a });
        }

        // 事件标记
        const evtIdx = this.eventData[idx];
        if (evtIdx > 0 && evtIdx <= this.events.length && this.events[evtIdx - 1]?.Active) {
          g.circle(px, py - this.TILE_H / 2 - 2, 3);
          g.fill({ color: 0xffff00 });
        }
      }
    }

    // 主角
    const ppx = viewCX + (this.manX - this.manY) * this.TILE_W / 2 - this.camera.x;
    const ppy = viewCY + (this.manX + this.manY) * this.TILE_H / 2 - this.camera.y;
    g.circle(ppx, ppy, 8);
    g.fill({ color: 0x4488ff });

    this.sceneContainer.addChild(g);
    this.endDrawScene();
  }
}
