import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import type { GameState, RoleSave } from '../data/Types';

/**
 * UIStatus — 角色状态界面
 * 对应 C++ UIStatus.cpp
 */
export class UIStatus extends RunNode {
  gameState!: GameState;
  private currentRoleIndex = 0;
  private textChildren: Text[] = [];

  loadState(state: GameState): void {
    this.gameState = state;
    this.currentRoleIndex = 0;
    this.drawStatus();
  }

  nextRole(): void {
    const team = this.gameState.Roles[this.gameState.SelfIndex]?.Team || [];
    const idx = team.indexOf(this.gameState.Roles[this.currentRoleIndex]?.ID ?? -1);
    if (idx >= 0 && idx + 1 < team.length) {
      this.currentRoleIndex = team[idx + 1];
    }
    this.drawStatus();
  }

  prevRole(): void {
    const team = this.gameState.Roles[this.gameState.SelfIndex]?.Team || [];
    const idx = team.indexOf(this.gameState.Roles[this.currentRoleIndex]?.ID ?? -1);
    if (idx > 0) {
      this.currentRoleIndex = team[idx - 1];
    }
    this.drawStatus();
  }

  private drawStatus(): void {
    this.textChildren.forEach(t => this.removeChild(t));
    this.textChildren = [];

    const role = this.gameState.Roles[this.currentRoleIndex];
    if (!role) return;

    const engine = Engine.getInstance();
    const lines = [
      `姓名: ${role.Name}  ${role.Nick ? `「${role.Nick}」` : ''}`,
      `等级: ${role.Level}  经验: ${role.Exp}`,
      `生命: ${role.HP} / ${role.MaxHP}`,
      `内力: ${role.MP} / ${role.MaxMP}  (${role.MPType === 0 ? '阴' : '阳'})`,
      `体力: ${role.PhysicalPower}  受伤: ${role.Hurt}  中毒: ${role.Poison}`,
      `攻击: ${role.Attack}  防御: ${role.Defence}  轻功: ${role.Speed}`,
      `拳掌: ${role.Fist}  剑法: ${role.Sword}  刀法: ${role.Blade}`,
      `特殊: ${role.Unusual}  暗器: ${role.HiddenWeapon}`,
      `医疗: ${role.Medicine}  用毒: ${role.UsePoison}  解毒: ${role.Detoxification}`,
      `抗毒: ${role.AntiPoison}  带毒: ${role.AttackWithPoison}`,
      `资质: ${role.IQ}  道德: ${role.Morality}  声望: ${role.Fame}`,
      `武学常识: ${role.Knowledge}  左右互博: ${role.AttackTwice ? '是' : '否'}`,
    ];

    // 武功列表
    lines.push('--- 武功 ---');
    for (let i = 0; i < role.MagicID.length; i++) {
      if (role.MagicID[i] > 0) {
        const magic = this.gameState.Magics[role.MagicID[i]];
        if (magic) {
          const levelBar = '█'.repeat(Math.min(10, role.MagicLevel[i]));
          lines.push(`  ${magic.Name}: Lv${role.MagicLevel[i]} ${levelBar}`);
        }
      }
    }

    lines.forEach((line, i) => {
      const color = line.includes('---') ? 0xffcc66 : 0xcccccc;
      const t = engine.createText(line, 15, color);
      t.x = 20;
      t.y = 10 + i * 22;
      this.addChild(t);
      this.textChildren.push(t);
    });
  }
}
