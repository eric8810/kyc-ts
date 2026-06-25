import { Container } from 'pixi.js';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';

/**
 * RunNode — 游戏节点基类（对应 C++ RunNode）
 * 
 * 所有需要显示和交互的游戏对象都继承此类。
 * 使用 PixiJS Container 作为渲染容器，支持树形嵌套。
 * 
 * 关键变更：C++ 的同步阻塞 run() → TS 的异步 Promise run()
 */
export class RunNode extends Container {
  /** 全局渲染栈（从底向上绘制） */
  static root: RunNode[] = [];

  /** 子节点列表 */
  protected childNodes: RunNode[] = [];

  /** 运行结果 */
  protected _result = -1;
  get result(): number { return this._result; }

  /** 全屏标记：设置后，此节点以下的层不绘制 */
  protected _fullWindow = 0;
  get fullWindow(): number { return this._fullWindow; }
  set fullWindow(v: number) { this._fullWindow = v; }

  /** 退出标记 */
  protected _exit = false;

  /** 是否在运行中 */
  protected _running = false;
  get running(): boolean { return this._running; }

  /** 可见性 */
  protected _visibleNode = true;
  get visibleNode(): boolean { return this._visibleNode; }
  set visibleNode(v: boolean) {
    this._visibleNode = v;
    this.visible = v;
  }

  /** 停留帧数（动画使用） */
  protected stayFrame = -1;
  protected currentFrame = 0;

  /** 暗化标记 */
  protected dark = 0;

  /** 节点状态 */
  protected nodeState: NodeState = NodeState.Normal;

  /** 活跃子节点索引 */
  protected activeChild = -1;

  /** 标签 */
  tag = 0;

  /** 是否处理事件 */
  dealEventEnabled = 1;

  /** 静态设置 */
  static renderMessage = 0;
  static useVirtualStick = 0;

  constructor() {
    super();
    this.label = 'RunNode';
  }

  // ============================================================
  // 生命周期虚方法（子类重写）
  // ============================================================

  /** 后台运行（每帧调用，仅当在 root 中时） */
  backRun(): void {}

  /** 绘制自身（PixiJS 自动绘制子节点，通常不需要重写） */
  draw(): void {}

  /** 处理输入事件 */
  dealEvent(e: InputEvent): void {}

  /** 进入节点 */
  onEntrance(): void {}

  /** 退出节点 */
  onExit(): void {}

  /** 按下确认键 */
  onPressedOK(): void {}

  /** 按下取消键 */
  onPressedCancel(): void {}

  // ============================================================
  // 子节点管理
  // ============================================================

  addChildNode(node: RunNode, x: number = 0, y: number = 0): RunNode {
    node.x = x;
    node.y = y;
    this.childNodes.push(node);
    this.addChild(node);
    return node;
  }

  getChild(index: number): RunNode | undefined {
    return this.childNodes[index];
  }

  getChildCount(): number {
    return this.childNodes.length;
  }

  removeChildNode(node: RunNode): void {
    const idx = this.childNodes.indexOf(node);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
      this.removeChild(node);
    }
  }

  clearChildren(): void {
    this.childNodes = [];
    this.removeChildren();
  }

  setAllChildState(state: NodeState): void {
    for (const child of this.childNodes) {
      child.nodeState = state;
    }
  }

  setAllChildVisible(v: boolean): void {
    for (const child of this.childNodes) {
      child.visibleNode = v;
    }
  }

  // ============================================================
  // 异步运行（替代 C++ 的同步阻塞 run()）
  // ============================================================

  async run(inRoot: boolean = true): Promise<number> {
    if (inRoot) {
      RunNode.root.push(this);
      // 添加到引擎场景层
      Engine.getInstance().showScene(this);
    }
    this._running = true;
    this._exit = false;
    this._result = -1;
    this.onEntrance();

    return new Promise<number>((resolve) => {
      const engine = Engine.getInstance();
      const input = InputManager.getInstance();

      const ticker = () => {
        if (this._exit) {
          engine.app.ticker.remove(ticker);
          this._running = false;
          this.onExit();
          if (inRoot) {
            const idx = RunNode.root.indexOf(this);
            if (idx >= 0) RunNode.root.splice(idx, 1);
          }
          resolve(this._result);
          return;
        }

        input.update();
        this.backRun();
        this.backRunChildren();
        this.draw();
        this.checkFrame();
      };

      engine.app.ticker.add(ticker);
    });
  }

  private dealEventSelf(engine: Engine): void {
    // 子类在 dealEvent 中处理
  }

  private backRunChildren(): void {
    for (const child of this.childNodes) {
      if (child.visibleNode) {
        child.backRun();
        child.backRunChildren();
      }
    }
  }

  /** 设置退出 */
  setExit(b: boolean): void { this._exit = b; }

  /** 退出并设置返回值 */
  exitWithResult(r: number): void {
    this._result = r;
    this._exit = true;
  }

  /** 获取活跃子节点索引 */
  getActiveChildIndex(): number { return this.activeChild; }

  /** 强制设置活跃子节点 */
  forceActiveChild(index: number): void {
    this.activeChild = index;
  }

  // ============================================================
  // 静态方法
  // ============================================================

  /** 绘制所有 root 节点 */
  static drawAll(): void {
    // PixiJS 自动绘制 Container 树，此方法保留用于兼容
  }

  /** 添加节点到 root 顶部 */
  static addToDrawTop(node: RunNode): void {
    RunNode.root.push(node);
  }

  /** 设置所有节点退出 */
  static exitAll(begin: number = 0): void {
    for (let i = begin; i < RunNode.root.length; i++) {
      RunNode.root[i].setExit(true);
    }
  }

  /** 从 root 中获取指定类型的节点 */
  static getFromRoot<T extends RunNode>(type: new (...args: any[]) => T): T | null {
    for (let i = RunNode.root.length - 1; i >= 0; i--) {
      if (RunNode.root[i] instanceof type) {
        return RunNode.root[i] as T;
      }
    }
    return null;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  setStayFrame(s: number): void { this.stayFrame = s; }

  checkFrame(): void {
    if (this.stayFrame > 0) {
      this.currentFrame++;
      if (this.currentFrame >= this.stayFrame) {
        this.currentFrame = 0;
        this.stayFrame = -1;
      }
    }
  }

  /** 时间检查（节流） */
  private prevTick = 0;
  checkPrevTimeElapsed(ms: number): boolean {
    const now = performance.now();
    if (now - this.prevTick >= ms) {
      this.prevTick = now;
      return true;
    }
    return false;
  }

  /** 鼠标是否在节点内 */
  protected mouseIn(): boolean {
    const input = InputManager.getInstance();
    const engine = Engine.getInstance();
    const { ux, uy } = engine.windowToUISpace(input.state.mouseX, input.state.mouseY);
    return ux >= this.x && ux <= this.x + this.width && uy >= this.y && uy <= this.y + this.height;
  }
}

/** 节点状态 */
export enum NodeState {
  Normal = 0,
  Pass = 1,
  Press = 2,
}

/** 方向 */
export enum Direct {
  None = 0,
  Left = 1,
  Up = 2,
  Right = 3,
  Down = 4,
}

/** 输入事件封装 */
export interface InputEvent {
  type: 'key' | 'mouse' | 'touch';
  key?: string;
  pressed?: boolean;
  x?: number;
  y?: number;
  button?: number;
}
