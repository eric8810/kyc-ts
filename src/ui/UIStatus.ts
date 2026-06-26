import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import { ResourceTextureCache } from '../data/ResourceTextureCache';
import type { GameState } from '../data/Types';

/**
 * UIStatus — 角色状态界面
 * 对应 C++ UIStatus.cpp
 */
export class UIStatus extends RunNode {
  gameState!: GameState;
  private currentRoleIndex = 0;
  private textChildren: Text[] = [];
  private readonly textureCache = ResourceTextureCache.getInstance();
  private headReady = false;

  loadState(state: GameState): void {
    this.gameState = state;
    this.currentRoleIndex = state.SelfIndex;
    this.headReady = false;
    const role = state.Roles[this.currentRoleIndex];
    if (role) this.textureCache.request('resource/head', role.HeadID);
    this.drawStatus();
  }

  nextRole(): void {
    const team = this.gameState.TeamIndex?.length ? this.gameState.TeamIndex : [this.gameState.SelfIndex];
    const idx = team.indexOf(this.currentRoleIndex);
    this.currentRoleIndex = team[(idx + 1 + team.length) % team.length] ?? this.currentRoleIndex;
    this.drawStatus();
  }

  prevRole(): void {
    const team = this.gameState.TeamIndex?.length ? this.gameState.TeamIndex : [this.gameState.SelfIndex];
    const idx = team.indexOf(this.currentRoleIndex);
    this.currentRoleIndex = team[(idx - 1 + team.length) % team.length] ?? this.currentRoleIndex;
    this.drawStatus();
  }

  private drawStatus(): void {
    this.removeChildren();
    this.textChildren = [];

    const role = this.gameState.Roles[this.currentRoleIndex];
    if (!role) return;
    this.textureCache.request('resource/head', role.HeadID);

    const engine = Engine.getInstance();
    const panel = new Graphics();
    panel.rect(8, 8, engine.uiWidth - 16, engine.uiHeight - 16);
    panel.fill({ color: 0x000000, alpha: 0.76 });
    panel.rect(8, 8, engine.uiWidth - 16, engine.uiHeight - 16);
    panel.stroke({ color: 0xd8d8d8, width: 1 });
    this.addChild(panel);

    const headFrame = new Graphics();
    headFrame.rect(22, 24, 104, 104);
    headFrame.fill({ color: 0x101826, alpha: 0.95 });
    headFrame.rect(22, 24, 104, 104);
    headFrame.stroke({ color: 0xd8d8d8, width: 1 });
    this.addChild(headFrame);

    const head = this.textureCache.createSprite('resource/head', role.HeadID, 74, 76, 1);
    if (head) {
      head.anchor.set(0.5);
      const maxSide = Math.max(head.width, head.height);
      if (maxSide > 96) head.scale.set(head.scale.x * (96 / maxSide));
      this.addChild(head);
    }

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

    lines.forEach((line, i) => {
      const t = engine.createText(line, 15, 0xeeeeee);
      t.x = i < 4 ? 146 : 24;
      t.y = i < 4 ? 24 + i * 24 : 142 + (i - 4) * 24;
      this.addChild(t);
      this.textChildren.push(t);
    });

    const magicTitle = engine.createText('武功', 16, 0xffcc66);
    magicTitle.x = 360;
    magicTitle.y = 24;
    this.addChild(magicTitle);

    let magicY = 52;
    for (let i = 0; i < role.MagicID.length; i++) {
      if (role.MagicID[i] > 0) {
        const magic = this.gameState.Magics[role.MagicID[i]];
        if (magic) {
          const level = role.MagicLevel[i] || 0;
          const t = engine.createText(`${magic.Name}: Lv${level}`, 14, 0xcccccc);
          t.x = 360;
          t.y = magicY;
          magicY += 22;
          this.addChild(t);
        }
      }
    }

    const hint = engine.createText('←/→ 切换角色  ESC/Enter 返回', 13, 0xaaaacc);
    hint.x = 24;
    hint.y = engine.uiHeight - 38;
    this.addChild(hint);
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    const role = this.gameState.Roles[this.currentRoleIndex];
    if (role) {
      this.textureCache.request('resource/head', role.HeadID);
      const ready = !!this.textureCache.getCached('resource/head', role.HeadID);
      if (ready !== this.headReady) {
        this.headReady = ready;
        this.drawStatus();
      }
    }
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA')) this.prevRole();
    if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD')) this.nextRole();
    if (input.isKeyPressed('Escape') || input.isKeyPressed('Enter') || input.isKeyPressed('Space')) this.exitWithResult(this.currentRoleIndex);
  }
}
