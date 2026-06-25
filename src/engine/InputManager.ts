export type GameKey = 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape' | 'space' | 'tab' | 'backspace' | 'delete';

export interface InputState {
  keys: Set<string>;
  keysJustPressed: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  mouseJustPressed: boolean;
  mouseJustReleased: boolean;
  mouseButton: number;
  wheelDelta: number;
  touchX: number;
  touchY: number;
  touchActive: boolean;
  touchJustStarted: boolean;
  touchJustEnded: boolean;
}

export class InputManager {
  private static instance: InputManager;
  static getInstance(): InputManager {
    if (!InputManager.instance) InputManager.instance = new InputManager();
    return InputManager.instance;
  }

  private canvas!: HTMLCanvasElement;
  private _state: InputState;
  private _prevKeys: Set<string> = new Set();
  private _prevMouseDown = false;
  private _prevTouchActive = false;
  private _wheelAccum = 0;

  private constructor() {
    this._state = {
      keys: new Set(),
      keysJustPressed: new Set(),
      mouseX: 0, mouseY: 0,
      mouseDown: false,
      mouseJustPressed: false,
      mouseJustReleased: false,
      mouseButton: 0,
      wheelDelta: 0,
      touchX: 0, touchY: 0,
      touchActive: false,
      touchJustStarted: false,
      touchJustEnded: false,
    };
  }

  get state(): Readonly<InputState> { return this._state; }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    document.addEventListener('keydown', e => {
      this._state.keys.add(e.code);
      if (!this._prevKeys.has(e.code)) {
        this._state.keysJustPressed.add(e.code);
      }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', e => {
      this._state.keys.delete(e.code);
    });

    canvas.addEventListener('mousemove', e => {
      this._state.mouseX = e.clientX;
      this._state.mouseY = e.clientY;
    });

    canvas.addEventListener('mousedown', e => {
      this._state.mouseDown = true;
      this._state.mouseButton = e.button;
    });

    canvas.addEventListener('mouseup', () => {
      this._state.mouseDown = false;
    });

    canvas.addEventListener('wheel', e => {
      this._wheelAccum += e.deltaY;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this._state.touchX = t.clientX;
      this._state.touchY = t.clientY;
      this._state.touchActive = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      this._state.touchX = t.clientX;
      this._state.touchY = t.clientY;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this._state.touchActive = false;
    }, { passive: false });
  }

  private _frameKeys: Set<string> = new Set();

  /** 每帧开始时调用 */
  update(): void {
    // 保存本帧刚按下的键（从上一帧到现在的积累）
    this._frameKeys = new Set(this._state.keysJustPressed);
    this._state.keysJustPressed.clear();
    this._state.mouseJustPressed = this._state.mouseDown && !this._prevMouseDown;
    this._state.mouseJustReleased = !this._state.mouseDown && this._prevMouseDown;
    this._state.touchJustStarted = this._state.touchActive && !this._prevTouchActive;
    this._state.touchJustEnded = !this._state.touchActive && this._prevTouchActive;
    this._state.wheelDelta = this._wheelAccum;
    this._wheelAccum = 0;
    this._prevMouseDown = this._state.mouseDown;
    this._prevTouchActive = this._state.touchActive;
    this._prevKeys = new Set(this._state.keys);
  }

  isKeyDown(key: string): boolean { return this._state.keys.has(key); }
  isKeyPressed(key: string): boolean { return this._frameKeys.has(key); }
  isAnyKeyPressed(): boolean { return this._frameKeys.size > 0; }

  /** 方向键综合状态 */
  get direction(): { dx: number; dy: number } {
    let dx = 0, dy = 0;
    if (this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW')) dy = -1;
    if (this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS')) dy = 1;
    if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA')) dx = -1;
    if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD')) dx = 1;
    return { dx, dy };
  }
}
