import { EventContext } from '../script/EventContext';

/** 调试用剧情战斗入口：用于验证事件脚本能真正打开 BattleScene 并等待胜负返回。 */
export async function ka1002(ctx: EventContext): Promise<void> {
  await ctx.talk(0, 0, '前方有恶人拦路，准备战斗！');
  const win = await ctx.battle(0);
  if (win) {
    await ctx.talk(0, 0, '战斗结束，继续前进吧。');
  } else {
    await ctx.talk(0, 0, '暂且退却，整备后再战。');
  }
}
