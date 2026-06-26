import { Graphics, Text } from 'pixi.js';
import { Scene } from '../core/Scene';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { ResourceTextureCache } from '../data/ResourceTextureCache';
import type { GameState, SubMapInfoSave, SubMapEvent } from '../data/Types';
import { ScriptRunner } from '../script/ScriptRunner';

/**
 * SubScene — 室内/洞窟场景
 * 64×64 等距网格，含事件系统
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
  private scriptRunner!: ScriptRunner;
  private message = '';
  private messageFrames = 0;
  private runningEvent = false;
  private readonly textureCache = ResourceTextureCache.getInstance();
  private readonly texturePath = 'resource/smap';

  constructor() {
    super();
    this.label = 'SubScene';
    this.COORD_COUNT = 64;
  }

  async init(gameState: GameState, subMapId: number): Promise<void> {
    this.gameState = gameState;
    this.subMapId = subMapId;
    this.scriptRunner = new ScriptRunner(gameState);

    // 加载子场景数据
    const info = gameState.SubMaps.find(s => s.ID === subMapId);
    if (info) {
      this.subMapInfo = info;
      this.events = gameState.SubMapEvents[subMapId] || [];
      this.earthData = (info.EarthSurface || []).map(v => Math.trunc(v / 2));
      this.surfaceData = new Array(this.mapW * this.mapH).fill(Math.trunc((info.Surface || 0) / 2));
      this.buildingData = new Array(this.mapW * this.mapH).fill(Math.trunc((info.Building || 0) / 2));
      this.eventData = info.Events || new Array(this.mapW * this.mapH).fill(0);
    } else {
      this.buildDemoInterior();
    }

    // 设置主角位置
    const role = gameState.Roles[gameState.SelfIndex];
    if (role) {
      const sx = role.SubMapX || 30;
      const sy = role.SubMapY || 30;
      this.manX = this.canWalk(sx, sy) ? sx : 30;
      this.manY = this.canWalk(sx, sy) ? sy : 30;
      role.SubMapX = this.manX;
      role.SubMapY = this.manY;
    }

    this.calViewRegion();
    this.camera.followIso(this.manX, this.manY, this.TILE_W, this.TILE_H, Engine.getInstance().uiWidth, Engine.getInstance().uiHeight);
    this.preloadVisibleTextures();
    console.log(`[SubScene] 进入场景 ${subMapId} (${this.events.length} 事件)`);
  }

  private buildDemoInterior(): void {
    this.earthData = new Array(this.mapW * this.mapH).fill(-1);
    this.surfaceData = new Array(this.mapW * this.mapH).fill(0);
    this.buildingData = new Array(this.mapW * this.mapH).fill(0);
    this.eventData = new Array(this.mapW * this.mapH).fill(0);

    // 用真实 smap 贴图拼一个可走的内景：木/石地面、墙体、桌柜、箱子。
    for (let y = 18; y <= 42; y++) {
      for (let x = 18; x <= 42; x++) {
        this.earthData[y * this.mapW + x] = (x + y) % 3 === 0 ? 10 : 0;
      }
    }

    for (let x = 18; x <= 42; x++) {
      this.setBuilding(x, 18, 1001 + (x % 4));
      this.setBuilding(x, 42, 1011 + (x % 4));
    }
    for (let y = 19; y < 42; y++) {
      this.setBuilding(18, y, 1021 + (y % 4));
      this.setBuilding(42, y, 1028 + (y % 4));
    }

    // 留出口和几件可辨识的大型室内物件。
    this.setBuilding(30, 42, 0);
    this.setBuilding(31, 42, 0);
    this.setBuilding(24, 25, 1400);
    this.setBuilding(25, 25, 1401);
    this.setBuilding(34, 26, 1622);
    this.setBuilding(35, 33, 1813);
    this.setBuilding(28, 35, 2289);

    // 演示事件：身前按 Space 触发 ka1001，走到右侧触发 ka0001
    this.events = [
      // 主角默认朝下，主动事件放在起始点前方，便于实际按 Space 验证脚本入口。
      { ID: 1, Type: 1, TriggerX: 30, TriggerY: 31, TriggerValue: 0, ScriptID: 1001, Active: 1 },
      // 经过右侧事件进入一场真实 BattleScene，用于覆盖剧情触发战斗链路。
      { ID: 2, Type: 0, TriggerX: 32, TriggerY: 30, TriggerValue: 0, ScriptID: 1002, Active: 1 },
    ];
    this.eventData[31 * this.mapW + 30] = 1;
    this.eventData[30 * this.mapW + 32] = 2;
  }

  private setBuilding(x: number, y: number, id: number): void {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return;
    this.buildingData[y * this.mapW + x] = id;
  }

  protected override canWalk(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
    const hasFloor = (this.earthData[y * this.mapW + x] ?? 0) >= 0;
    const b = this.buildingData[y * this.mapW + x];
    return hasFloor && b <= 0;
  }

  protected override isOutScreen(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.mapW || y >= this.mapH;
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const engine = Engine.getInstance();

    if (this.messageFrames > 0) this.messageFrames--;

    // 方向键行走
    const { dx, dy } = input.direction;
    if (dx !== 0 || dy !== 0) {
      const nx = this.manX + dx;
      const ny = this.manY + dy;
      if (!this.runningEvent && this.canWalk(nx, ny)) {
        this.manX = nx;
        this.manY = ny;
        this.step = (this.step + 1) % 7;
        this.changeTowardsByKey(
          dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp'
        );
        this.syncRolePosition();
      }
    }

    // 鼠标点击
    if (input.state.mouseJustPressed) {
      const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
      const target = this.getMousePositionIso(ux, uy, this.camera.x, this.camera.y);
      if (this.canWalk(target.x, target.y)) {
        this.FindWay(this.manX, this.manY, target.x, target.y);
      }
    }

    if (this.walkStep()) {
      this.step = (this.step + 1) % 7;
      this.syncRolePosition();
    }

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

    this.camera.followIso(this.manX, this.manY, this.TILE_W, this.TILE_H, engine.uiWidth, engine.uiHeight);
    this.preloadVisibleTextures();
  }

  private syncRolePosition(): void {
    const role = this.gameState.Roles[this.gameState.SelfIndex];
    if (role) {
      role.SubMapX = this.manX;
      role.SubMapY = this.manY;
      role.Face = this.towards;
    }
  }

  /** 经过事件：走到特定坐标自动触发 */
  private checkPassEvent(): void {
    const idx = this.manY * this.mapW + this.manX;
    const eventIdx = this.eventData[idx];
    if (eventIdx <= 0 || eventIdx > this.events.length) return;

    const event = this.events[eventIdx - 1];
    if (!event || event.Type !== 0) return; // Type 0 = 经过事件
    if (!event.Active) return;

    void this.triggerEvent(event, '经过');
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

    void this.triggerEvent(event, '主动');
  }

  private async triggerEvent(event: SubMapEvent, kind: string): Promise<void> {
    if (this.runningEvent || !event.Active) return;
    this.runningEvent = true;
    this.message = `${kind}事件 #${event.ScriptID}`;
    this.messageFrames = 180;
    console.log(`[SubScene] 触发${kind}事件 ${event.ScriptID}`);
    try {
      await this.scriptRunner.runScript(event.ScriptID);
      // 事件是否失活应由脚本/事件数据决定；默认不关闭，避免可重复对话、商店、门等互动只触发一次后失效。
      this.message = `${kind}事件完成：脚本 ${event.ScriptID}`;
      this.messageFrames = 240;
    } finally {
      this.runningEvent = false;
    }
  }

  private preloadVisibleTextures(): void {
    const ids = new Set<number>();
    for (let dy = -18; dy <= 18; dy++) {
      for (let dx = -18; dx <= 18; dx++) {
        const x = this.manX + dx;
        const y = this.manY + dy;
        if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) continue;
        const idx = y * this.mapW + x;
        if (this.earthData[idx] >= 0) ids.add(this.earthData[idx]);
        if (this.surfaceData[idx] > 0) ids.add(this.surfaceData[idx]);
        if (this.buildingData[idx] > 0) ids.add(this.buildingData[idx]);
      }
    }
    for (let i = 0; i < 28; i++) ids.add(2501 + i);
    void this.textureCache.preload(this.texturePath, ids);
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

  override draw(): void {
    this.beginDrawScene();
    const engine = Engine.getInstance();
    const fallback = new Graphics();
    const objects: { z: number; node: any }[] = [];
    const viewCX = -this.camera.x;
    const viewCY = -this.camera.y;

    fallback.rect(0, 0, engine.uiWidth, engine.uiHeight);
    fallback.fill({ color: 0x000000 });

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const px = viewCX + (x - y) * this.TILE_W;
        const py = viewCY + (x + y) * this.TILE_H;

        if (px < -180 || px > engine.uiWidth + 180 || py < -240 || py > engine.uiHeight + 120) continue;

        const idx = y * this.mapW + x;

        // 地面
        const tile = this.earthData[idx] ?? 0;
        if (tile >= 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, tile, px, py);
          if (sprite) this.sceneContainer.addChild(sprite);
          else this.drawFallbackTile(fallback, px, py, 0x584733 + (tile % 8) * 0x030303, 0.9);
        }

        const surface = this.surfaceData[idx] ?? 0;
        if (surface > 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, surface, px, py);
          if (sprite) this.sceneContainer.addChild(sprite);
        }

        // 建筑/摆设，按 (x+y,x) 排序后覆盖角色。
        const building = this.buildingData[idx] ?? 0;
        if (building > 0) {
          const sprite = this.textureCache.createSprite(this.texturePath, building, px, py);
          if (sprite) objects.push({ z: ((x + y) * 1024 + x) * 2 + 1, node: sprite });
          else this.drawFallbackTile(fallback, px, py - this.TILE_H, 0x6a4a2a, 0.75);
        }

        // 事件标记：保留轻微高亮，便于调试交互点。
        const evtIdx = this.eventData[idx];
        if (evtIdx > 0 && evtIdx <= this.events.length && this.events[evtIdx - 1]?.Active) {
          fallback.circle(px, py - 16, 3);
          fallback.fill({ color: 0xffff00, alpha: 0.85 });
        }

        if (x === this.manX && y === this.manY) {
          const manPic = 2501 + this.towards * 7 + (this.step % 7);
          const sprite = this.textureCache.createSprite(this.texturePath, manPic, px, py);
          if (sprite) objects.push({ z: ((x + y) * 1024 + x) * 2, node: sprite });
          else {
            fallback.circle(px, py - 18, 7);
            fallback.fill({ color: 0x4488ff });
          }
        }
      }
    }

    this.sceneContainer.addChildAt(fallback, 0);
    objects.sort((a, b) => a.z - b.z);
    for (const obj of objects) this.sceneContainer.addChild(obj.node);

    if (this.message && this.messageFrames > 0) {
      const box = new Graphics();
      box.rect(16, engine.uiHeight - 72, engine.uiWidth - 32, 54);
      box.fill({ color: 0x000000, alpha: 0.72 });
      box.rect(16, engine.uiHeight - 72, engine.uiWidth - 32, 54);
      box.stroke({ color: 0xd8d8d8, width: 1 });
      this.sceneContainer.addChild(box);

      const t = new Text({
        text: this.message,
        style: { fontFamily: 'SimHei, Microsoft YaHei, sans-serif', fontSize: 18, fill: 0xffee88 },
      });
      t.x = 28;
      t.y = engine.uiHeight - 58;
      this.sceneContainer.addChild(t);
    }
    this.endDrawScene();
  }
}
