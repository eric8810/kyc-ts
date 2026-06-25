import type { GameState } from '../data/Types';
import { EventContext } from '../script/EventContext';

/**
 * EventSystem — 剧情事件系统
 * 对应 C++ Event.cpp 的事件执行和条件判断
 */
export class EventSystem {
  private gameState: GameState;
  private ctx: EventContext;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.ctx = new EventContext(gameState);
  }

  get context(): EventContext { return this.ctx; }

  /** 执行事件脚本 */
  async executeEvent(scriptId: number): Promise<void> {
    console.log(`[EventSystem] 执行脚本 ${scriptId}`);
    // 脚本执行由 ScriptRunner 处理
  }

  /** 检查事件条件 */
  checkEventCondition(conditionType: number, params: number[]): boolean {
    switch (conditionType) {
      case 0: // 判断是否在队伍中
        return this.ctx.judgeInTeam(params[0]);
      case 1: // 判断物品
        return this.ctx.hasItem(params[0]);
      case 2: // 判断属性
        return this.ctx.judgeRoleAttr(params[0], params[1]) >= (params[2] ?? 0);
      case 3: // 判断道德
        return this.ctx.getMorality() >= (params[0] ?? 0);
      case 4: // 判断声望
        return this.ctx.getFame() >= (params[0] ?? 0);
      case 5: // 判断死亡
        return this.ctx.dead(params[0]);
      case 6: // 判断武学
        return this.ctx.haveMagic(params[0], params[1]);
      case 7: // 判断全局变量
        return this.ctx.getVar(params[0]) >= (params[1] ?? 0);
      default:
        console.warn(`[EventSystem] 未知条件类型: ${conditionType}`);
        return false;
    }
  }

  /** 检查场景事件触发 */
  checkSceneEvent(eventType: number, triggerValue: number, x: number, y: number): boolean {
    switch (eventType) {
      case 0: return true; // 经过事件总是触发
      case 1: return true; // 主动事件（已由 Space 键触发）
      case 2: {           // 使用物品事件
        const role = this.gameState.Roles[this.gameState.SelfIndex];
        return role?.Item.includes(triggerValue) ?? false;
      }
      case 3: return true; // 通过事件
      default: return false;
    }
  }
}
