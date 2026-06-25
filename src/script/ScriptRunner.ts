import { EventContext } from './EventContext';
import type { GameState } from '../data/Types';

/**
 * ScriptRunner — 脚本调度器
 * 加载并执行转换后的 TypeScript 事件脚本
 */
export class ScriptRunner {
  private ctx: EventContext;
  private callStack: number[] = [];
  private running = false;

  constructor(gameState: GameState) {
    this.ctx = new EventContext(gameState);
  }

  /** 更新游戏状态引用 */
  setGameState(gs: GameState): void {
    this.ctx.gameState = gs;
  }

  /** 执行指定编号的脚本 */
  async runScript(scriptId: number): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.callStack.push(scriptId);

    try {
      const moduleName = `ka${scriptId.toString().padStart(4, '0')}`;
      try {
        const module = await import(`../event/${moduleName}.ts`);
        const fn = module[moduleName];
        if (fn && typeof fn === 'function') {
          await fn(this.ctx);
        } else {
          console.warn(`Script ${moduleName} has no export function`);
        }
      } catch (e) {
        console.warn(`Script ${moduleName} not found or failed:`, e);
      }
    } finally {
      this.callStack.pop();
      this.running = false;
    }
  }

  /** 跳转到另一个脚本 */
  async jumpTo(scriptId: number): Promise<void> {
    await this.runScript(scriptId);
  }

  /** 检查是否正在运行 */
  isRunning(): boolean { return this.running; }

  /** 获取当前脚本ID */
  currentScriptId(): number | undefined {
    return this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : undefined;
  }
}
