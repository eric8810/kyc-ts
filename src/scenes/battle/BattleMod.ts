import { BattleScene } from './BattleScene';
import type { GameState } from '../../data/Types';

/**
 * BattleMod — YAML驱动战斗特效系统
 * 暴击/连击/封穴/怒气等特效
 */
export class BattleMod extends BattleScene {
  private effectConfig: any = {};
  private critRate = 10;
  private comboRate = 0;
  private statusEffects: Map<number, { id: number; value: number; max: number }> = new Map();

  constructor(gameState: GameState, battleId: number, config?: any) {
    super(gameState, battleId);
    this.label = 'BattleMod';
    if (config) this.effectConfig = config;
    this.initEffects();
  }

  private initEffects(): void {
    // 默认状态
    this.statusEffects.set(0, { id: 0, value: 0, max: 100 }); // 内伤
    this.statusEffects.set(1, { id: 1, value: 0, max: 100 }); // 中毒
    this.statusEffects.set(2, { id: 2, value: 100, max: 100 }); // 体力
    this.statusEffects.set(3, { id: 3, value: 0, max: 100 }); // 怒气
    this.statusEffects.set(4, { id: 4, value: 0, max: 100 }); // 封穴
    this.statusEffects.set(6, { id: 6, value: 0, max: 100 }); // 外伤
  }

  /** 计算攻击特效 */
  calcAttackEffects(attacker: any, defender: any): { crit: boolean; combo: boolean; statusApplied: { id: number; val: number }[] } {
    const result = { crit: false, combo: false, statusApplied: [] as { id: number; val: number }[] };

    // 暴击判断
    const critChance = this.critRate + (attacker.role?.IQ || 0) * 0.2 + (attacker.role?.MP || 0) * 0.01;
    if (Math.random() * 100 < critChance) {
      result.crit = true;
    }

    // 连击判断（左右互搏）
    if ((attacker.role?.AttackTwice || 0) > 0) {
      const comboChance = 60 - (attacker.role?.IQ || 0);
      if (Math.random() * 100 < comboChance) {
        result.combo = true;
      }
    }

    // 封穴（拳掌攻击）
    if ((attacker.role?.Fist || 0) > 0) {
      const sealChance = attacker.role.Fist;
      if (Math.random() * 100 < sealChance) {
        const sealVal = Math.floor(Math.random() * 20) + 5;
        result.statusApplied.push({ id: 4, val: sealVal }); // 封穴
      }
    }

    // 怒气积累（防守方）
    const rageGain = 25 + Math.floor(Math.random() * 11); // 25-35
    result.statusApplied.push({ id: 3, val: rageGain });

    return result;
  }

  /** 应用暴击伤害倍率 */
  applyCritDamage(baseDamage: number): number {
    return Math.floor(baseDamage * 1.5); // 150%伤害
  }

  /** 获取状态值 */
  getStatusValue(statusId: number): number {
    return this.statusEffects.get(statusId)?.value ?? 0;
  }

  /** 修改状态值 */
  modifyStatus(statusId: number, delta: number): void {
    const status = this.statusEffects.get(statusId);
    if (status) {
      status.value = Math.max(0, Math.min(status.max, status.value + delta));
    }
  }

  /** 应用状态效果到伤害 */
  applyStatusToDamage(baseDamage: number, defender: any): number {
    let damage = baseDamage;

    // 外伤增伤
    const waishang = this.getStatusValue(6);
    damage += waishang;

    return Math.max(1, damage);
  }

  override calMagicHurt(attacker: any, defender: any, magic: any): number {
    let damage = super.calMagicHurt(attacker, defender, magic);

    // 应用特效
    const effects = this.calcAttackEffects(attacker, defender);
    if (effects.crit) damage = this.applyCritDamage(damage);
    damage = this.applyStatusToDamage(damage, defender);

    // 应用状态
    for (const sa of effects.statusApplied) {
      this.modifyStatus(sa.id, sa.val);
    }

    return damage;
  }
}
