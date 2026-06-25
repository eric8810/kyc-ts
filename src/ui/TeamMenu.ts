import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import type { GameState } from '../data/Types';

/**
 * TeamMenu — 队伍管理界面
 * 对应 C++ TeamMenu.cpp
 */
export class TeamMenu extends RunNode {
  gameState!: GameState;
  private selectedIndex = 0;
  private teamIds: number[] = [];

  loadState(state: GameState): void {
    this.gameState = state;
    const self = state.Roles[state.SelfIndex];
    this.teamIds = self?.Team?.filter(id => id > 0) || [];
    this.internalDraw();
  }

  private internalDraw(): void {
    this.removeChildren();
    const engine = Engine.getInstance();

    const title = engine.createText('队伍管理', 24, 0xffcc66);
    title.x = 20; title.y = 15;
    this.addChild(title);

    this.teamIds.forEach((roleId, i) => {
      const role = this.gameState.Roles[roleId];
      if (!role) return;

      const y = 60 + i * 50;
      const selected = i === this.selectedIndex;

      const bg = new Graphics();
      bg.roundRect(20, y, 400, 40, 4);
      bg.fill({ color: selected ? 0x3a3a5a : 0x1a1a2e });
      this.addChild(bg);

      const name = engine.createText(`${role.Name}`, 16, selected ? 0xffcc66 : 0xcccccc);
      name.x = 30; name.y = y + 10;
      this.addChild(name);

      const info = engine.createText(`Lv${role.Level} HP${role.HP}/${role.MaxHP}`, 14, 0x888888);
      info.x = 150; info.y = y + 12;
      this.addChild(info);

      const isLeader = roleId === this.gameState.SelfIndex;
      const status = engine.createText(isLeader ? '👑队长' : '队员', 13, isLeader ? 0xffaa00 : 0x6688aa);
      status.x = 330; status.y = y + 12;
      this.addChild(status);
    });

    // 空槽位
    for (let i = this.teamIds.length; i < 6; i++) {
      const y = 60 + i * 50;
      const empty = engine.createText('（空位）', 14, 0x444444);
      empty.x = 30; empty.y = y + 10;
      this.addChild(empty);
    }
  }
}
