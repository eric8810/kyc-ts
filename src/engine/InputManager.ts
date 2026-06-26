export type GameKey = 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape' | 'space' | 'tab' | 'backspace' | 'delete';

export const DEFAULT_KEY_BINDINGS: Record<string, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  confirm: 'Enter',
  cancel: 'Escape',
  menu: 'Escape',
  status: 'KeyS',
  item: 'KeyI',
};

const STORAGE_KEY = 'kys.keyBindings';

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
  private bindings: Record<string, string> = { ...DEFAULT_KEY_BINDINGS };

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
      touchX: 0,
      touchY: 0,
      touchActive: false,
      touchJustStarted: false,
      touchJustEnded: false,
    };
    this.loadBindings();
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

  getKeyBindings(): Record<string, string> {
    return { ...this.bindings };
  }

  setKeyBinding(action: string, key: string): void {
    if (!(action in DEFAULT_KEY_BINDINGS)) return;
    this.bindings[action] = key;
    this.saveBindings();
  }

  setKeyBindings(bindings: Record<string, string>): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...bindings };
    this.saveBindings();
  }

  resetKeyBindings(): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS };
    this.saveBindings();
  }

  private loadBindings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.bindings = { ...DEFAULT_KEY_BINDINGS, ...JSON.parse(raw) };
    } catch {}
  }

  private saveBindings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {}
  }

  private actionsForDefaultKey(key: string): string[] {
    return Object.keys(DEFAULT_KEY_BINDINGS).filter(action => DEFAULT_KEY_BINDINGS[action] === key);
  }

  private boundKeyForDefaultKey(key: string): string[] {
    const actions = this.actionsForDefaultKey(key);
    return actions.map(action => this.bindings[action] || DEFAULT_KEY_BINDINGS[action]);
  }

  isKeyDown(key: string): boolean {
    if (this._state.keys.has(key)) return true;
    return this.boundKeyForDefaultKey(key).some(bound => bound !== key && this._state.keys.has(bound));
  }

  isKeyPressed(key: string): boolean {
    if (this._frameKeys.has(key)) return true;
    return this.boundKeyForDefaultKey(key).some(bound => bound !== key && this._frameKeys.has(bound));
  }

  isActionDown(action: string): boolean {
    const key = this.bindings[action] || DEFAULT_KEY_BINDINGS[action];
    return !!key && this._state.keys.has(key);
  }

  isActionPressed(action: string): boolean {
    const key = this.bindings[action] || DEFAULT_KEY_BINDINGS[action];
    return !!key && this._frameKeys.has(key);
  }

  isAnyKeyPressed(): boolean { return this._frameKeys.size > 0; }
  getPressedKeys(): string[] { return [...this._frameKeys]; }

  /** 方向键综合状态 */
  get direction(): { dx: number; dy: number } {
    let dx = 0, dy = 0;
    if (this.isActionDown('up')) dy = -1;
    if (this.isActionDown('down')) dy = 1;
    if (this.isActionDown('left')) dx = -1;
    if (this.isActionDown('right')) dx = 1;
    return { dx, dy };
  }
}
