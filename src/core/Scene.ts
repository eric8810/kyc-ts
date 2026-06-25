import { Container, Graphics } from 'pixi.js';
import { RunNode, NodeState, Direct } from './RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { Camera } from './Camera';
import { TILE_W_0, TILE_H_0 } from '../data/Types';

export interface Point {
  x: number;
  y: number;
}

/**
 * Scene — 场景基类（继承 RunNode）
 * 对应 C++ Scene.h
 * 
 * 主地图、室内场景、战斗场景均继承此类
 */
export class Scene extends RunNode {
  /** 瓦片尺寸 */
  static TILE_W_0 = TILE_W_0;  // 18
  static TILE_H_0 = TILE_H_0;  // 9
  TILE_W = TILE_W_0;
  TILE_H = TILE_H_0;

  /** 设置瓦片缩放 */
  setTileScale(scale: number): void {
    this.TILE_W = TILE_W_0 * scale;
    this.TILE_H = TILE_H_0 * scale;
  }

  /** 渲染中心 */
  renderCenterX = 0;
  renderCenterY = 0;

  /** 视野区域 */
  viewWidthRegion = 0;
  viewSumRegion = 0;

  /** 行走控制 */
  totalStep = 0;
  prePressed = '';
  prePressedTicks = 0;
  static keyWalkDelay = 20; // ms

  /** 主角位置 */
  manX = 0;
  manY = 0;

  /** 鼠标事件目标 */
  mouseEventX = -1;
  mouseEventY = -1;

  /** 光标 */
  cursorX = 0;
  cursorY = 0;
  towards = 0;  // 0-3 朝向
  step = 0;     // 行走动画帧
  manPic = 0;

  /** 休息计时 */
  restTime = 0;

  /** 坐标计数 */
  COORD_COUNT = 0;
  firstStepDelay = 5;

  /** 相机 */
  camera = new Camera();

  /** 路径栈 */
  wayQueue: Point[] = [];

  /** 场景容器（渲染目标） */
  sceneContainer: Container = new Container();

  constructor() {
    super();
    this.label = 'Scene';
    this._fullWindow = 1; // 场景默认全屏
  }

  // ============================================================
  // 坐标变换（等距菱形）
  // ============================================================

  /** 地图坐标 → 屏幕坐标 */
  getPositionOnRender(mx: number, my: number, viewX: number, viewY: number): Point {
    return {
      x: (mx - my) * this.TILE_W / 2 - viewX,
      y: (mx + my) * this.TILE_H / 2 - viewY,
    };
  }

  /** 屏幕坐标 → 地图坐标 */
  getMousePosition(mouseX: number, mouseY: number, viewX: number, viewY: number): Point {
    const sx = mouseX + viewX;
    const sy = mouseY + viewY;
    const mx = (sx / (this.TILE_W / 2) + sy / (this.TILE_H / 2)) / 2;
    const my = (sy / (this.TILE_H / 2) - sx / (this.TILE_W / 2)) / 2;
    return { x: Math.floor(mx), y: Math.floor(my) };
  }

  /** 获取鼠标对应的地图位置 */
  getMouseMapPosition(viewX: number, viewY: number): Point {
    const input = InputManager.getInstance();
    const engine = Engine.getInstance();
    const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
    return this.getMousePosition(ux, uy, viewX, viewY);
  }

  /** 计算朝向 */
  calTowards(x1: number, y1: number, x2: number, y2: number): number {
    if (y2 > y1) return 0;  // 下
    if (x2 < x1) return 1;  // 左
    if (y2 < y1) return 2;  // 上
    return 3;               // 右
  }

  /** 曼哈顿距离 */
  calDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /** 碰撞块索引 */
  calBlockTurn(x: number, y: number, layer: number): number {
    return 4 * (128 * (x + y) + x) + layer;
  }

  /** 根据方向键改变朝向 */
  changeTowardsByKey(key: string): void {
    switch (key) {
      case 'ArrowDown': case 'KeyS': this.towards = 0; break;
      case 'ArrowLeft': case 'KeyA': this.towards = 1; break;
      case 'ArrowUp': case 'KeyW': this.towards = 2; break;
      case 'ArrowRight': case 'KeyD': this.towards = 3; break;
    }
  }

  /** 获取朝向坐标偏移 */
  static getTowardsPosition(x: number, y: number, tw: number, out: { x: number; y: number }): void {
    switch (tw) {
      case 0: out.x = x; out.y = y + 1; break; // 下
      case 1: out.x = x - 1; out.y = y; break; // 左
      case 2: out.x = x; out.y = y - 1; break; // 上
      case 3: out.x = x + 1; out.y = y; break; // 右
      default: out.x = x; out.y = y; break;
    }
  }

  // ============================================================
  // A* 寻路
  // ============================================================

  protected canWalk(x: number, y: number): boolean { return false; }
  protected isOutScreen(x: number, y: number): boolean { return false; }

  private astarNodes: Map<number, { x: number; y: number; g: number; h: number; f: number; parent: number | null }> = new Map();

  FindWay(mx: number, my: number, fx: number, fy: number): void {
    this.wayQueue = [];
    this.astarNodes.clear();

    const key = (x: number, y: number) => x * 10000 + y;
    const startKey = key(mx, my);
    const endKey = key(fx, fy);

    this.astarNodes.set(startKey, { x: mx, y: my, g: 0, h: this.calDistance(mx, my, fx, fy), f: 0, parent: null });
    const openList: number[] = [startKey];

    while (openList.length > 0) {
      // 找 f 最小的
      let bestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        const a = this.astarNodes.get(openList[i]);
        const b = this.astarNodes.get(openList[bestIdx]);
        if (a && b && a.f < b.f) bestIdx = i;
      }

      const curKey = openList.splice(bestIdx, 1)[0];
      const cur = this.astarNodes.get(curKey);
      if (!cur) break;

      if (curKey === endKey) {
        // 回溯路径
        let p: number | null = curKey;
        const path: Point[] = [];
        while (p !== null) {
          const node = this.astarNodes.get(p);
          if (!node) break;
          path.unshift({ x: node.x, y: node.y });
          p = node.parent;
        }
        this.wayQueue = path.slice(1); // 去掉起点
        return;
      }

      // 扩展四方向
      const dirs = [[0, 1], [-1, 0], [0, -1], [1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nk = key(nx, ny);

        if (this.astarNodes.has(nk)) continue;
        if (!this.canWalk(nx, ny)) continue;
        if (this.isOutScreen(nx, ny)) continue;

        const g = cur.g + 1;
        const h = this.calDistance(nx, ny, fx, fy);
        const f = g + 2 * h; // 权重：步数 + 2*曼哈顿距离
        this.astarNodes.set(nk, { x: nx, y: ny, g, h, f, parent: curKey });
        openList.push(nk);
      }
    }
  }

  // ============================================================
  // 行走处理
  // ============================================================

  checkWalk(x: number, y: number): number {
    // 返回 0=不可走, 1=可走, 2=到达事件/入口
    if (!this.canWalk(x, y)) return 0;
    return 1;
  }

  /** 走一步 */
  walkStep(): boolean {
    if (this.wayQueue.length === 0) return false;
    const target = this.wayQueue[0];
    if (target.x === this.manX && target.y === this.manY) {
      this.wayQueue.shift();
      return this.wayQueue.length > 0;
    }
    this.towards = this.calTowards(this.manX, this.manY, target.x, target.y);
    this.manX += target.x > this.manX ? 1 : target.x < this.manX ? -1 : 0;
    this.manY += target.y > this.manY ? 1 : target.y < this.manY ? -1 : 0;
    this.step = (this.step + 1) % 4;
    return true;
  }

  // ============================================================
  // 视野计算
  // ============================================================

  calViewRegion(): void {
    const engine = Engine.getInstance();
    this.viewWidthRegion = Math.ceil(engine.uiWidth / this.TILE_W) + 2;
    this.viewSumRegion = this.viewWidthRegion * 2;
  }

  // ============================================================
  // 场景绘制开始/结束
  // ============================================================

  beginDrawScene(): void {
    // 清除旧的绘制内容（直接绘制到 this Container）
    this.removeChildren();
  }

  endDrawScene(): void {
    // PixiJS 自动渲染，无需手动操作
  }

  /** 暗化场景 */
  lightScene(): void {
    this.dark = 0;
  }

  darkScene(): void {
    this.dark = 1;
  }

  /** 是否在地图边界 */
  isOutLine(x: number, y: number): boolean {
    return false; // 子类实现
  }

  /** 获取大地图位置 */
  getPositionOnWholeEarth(x: number, y: number): Point {
    return { x, y };
  }

  // ============================================================
  // 角色位置
  // ============================================================

  setManPosition(x: number, y: number): void {
    this.manX = x;
    this.manY = y;
  }

  getManPosition(): Point {
    return { x: this.manX, y: this.manY };
  }

  setManPic(pic: number): void {
    this.manPic = pic;
  }

  setTowards(t: number): void {
    this.towards = t;
  }

  setMouseEventPoint(x: number, y: number): void {
    this.mouseEventX = x;
    this.mouseEventY = y;
  }

  static setKeyWalkDelay(d: number): void {
    Scene.keyWalkDelay = d;
  }
}
