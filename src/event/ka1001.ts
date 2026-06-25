// Auto-generated sample event script
// This is a placeholder - real scripts come from Lua→TS conversion
import { EventContext } from '../script/EventContext';

export async function ka1001(ctx: EventContext): Promise<void> {
  await ctx.talk(1, 0, "欢迎来到金庸群侠传 Web 版！");
  ctx.addItem(1, 1);           // 给予初始物品
  ctx.addHP(50);               // 恢复生命
  ctx.setGlobalVar(100, 1);    // 标记事件已触发
}

export async function ka1002(ctx: EventContext): Promise<void> {
  if (ctx.getGlobalVar(100) === 1) {
    await ctx.talk(1, 0, "你已经完成了第一个任务。");
    ctx.addMorality(5);
  } else {
    await ctx.talk(1, 0, "你需要先完成之前的任务。");
  }
}
