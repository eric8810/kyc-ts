// Auto-generated from Lua script ka0001.lua
import { EventContext } from '../script/EventContext';

export async function ka0001(ctx: EventContext): Promise<void> {
  // 开场事件
  await ctx.talk(1, 0, "少侠，你终于来了。");
  ctx.addItem(1, 1);
  ctx.addMorality(5);
}
