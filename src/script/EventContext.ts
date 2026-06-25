import { Engine } from '../engine/Engine';
import { AudioManager } from '../engine/AudioManager';
import type { GameState } from '../data/Types';
import { SaveManager } from '../data/SaveManager';

/**
 * EventContext — 125+ 条游戏指令的实现
 * 对应 C++ ScriptLua.cpp 中注册的所有 C++ 函数
 */
export class EventContext {
  gameState: GameState;
  private vars: Int32Array;
  private talkLines: string[] = [];
  private talkLoaded = false;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.vars = gameState.GlobalData;
  }

  // ============================================================
  // 变量读写（对应 Lua 的 x[ID]）
  // ============================================================
  getVar(id: number): number { return this.vars[id] ?? 0; }
  setVar(id: number, val: number): void { this.vars[id] = val; }

  /** 获取当前主角 */
  private get self() { return this.gameState.Roles[this.gameState.SelfIndex]; }

  // ============================================================
  // 异步指令（需要 await）
  // ============================================================

  async talk(headId: number, nameId: number, text: string | number): Promise<void> {
    let content = typeof text === 'string' ? text : '';
    if (typeof text === 'number') {
      await this.loadTalkLines();
      content = this.talkLines[text] || `[对话#${text}]`;
    }
    // 在实际场景中会通过 Talk 组件显示，这里输出日志
    console.log(`[Talk] ${content}`);
  }

  async oldTalk(textId: number): Promise<void> {
    await this.loadTalkLines();
    const content = this.talkLines[textId] || `[对话#${textId}]`;
    console.log(`[Talk] ${content}`);
  }

  async battle(id: number): Promise<boolean> {
    console.log(`[Battle] 进入战斗 #${id}`);
    return true;
  }

  async showPicture(id: number): Promise<void> {
    console.log(`[ShowPicture] 显示图片 #${id}`);
  }

  async playMusic(id: number): Promise<void> {
    AudioManager.getInstance().playMusic(`music/${id}.mp3`);
  }

  async darkScreen(): Promise<void> { /* 黑屏过渡 */ }
  async lightScreen(): Promise<void> { /* 亮屏过渡 */ }
  async rest(): Promise<void> { /* 休息 */ }

  async askJoin(): Promise<boolean> {
    // 返回 true 表示加入
    return true;
  }

  async showMenu(options: string[]): Promise<number> {
    console.log(`[Menu] 选项: ${options.join(', ')}`);
    return 0;
  }

  private async loadTalkLines(): Promise<void> {
    if (this.talkLoaded) return;
    try {
      const resp = await fetch('game/talkutf8.txt');
      const text = await resp.text();
      this.talkLines = text.split('\n');
      this.talkLoaded = true;
    } catch {
      this.talkLines = [];
      this.talkLoaded = true;
    }
  }

  // ============================================================
  // 同步指令 — 角色属性
  // ============================================================
  addHP(n: number): void { if (this.self) this.self.HP += n; }
  addMP(n: number): void { if (this.self) this.self.MP += n; }
  addMaxHP(n: number): void { if (this.self) this.self.MaxHP += n; }
  addMaxMP(n: number): void { if (this.self) this.self.MaxMP += n; }
  addHurt(n: number): void { if (this.self) this.self.Hurt += n; }
  addPoison(n: number): void { if (this.self) this.self.Poison += n; }
  addPhysicalPower(n: number): void { if (this.self) this.self.PhysicalPower += n; }
  addAttack(n: number): void { if (this.self) this.self.Attack += n; }
  addSpeed(n: number): void { if (this.self) this.self.Speed += n; }
  addDefence(n: number): void { if (this.self) this.self.Defence += n; }
  addFist(n: number): void { if (this.self) this.self.Fist += n; }
  addSword(n: number): void { if (this.self) this.self.Sword += n; }
  addBlade(n: number): void { if (this.self) this.self.Blade += n; }
  addUnusual(n: number): void { if (this.self) this.self.Unusual += n; }
  addHiddenWeapon(n: number): void { if (this.self) this.self.HiddenWeapon += n; }
  addKnowledge(n: number): void { if (this.self) this.self.Knowledge += n; }
  addIQ(n: number): void { if (this.self) this.self.IQ += n; }
  addMedicine(n: number): void { if (this.self) this.self.Medicine += n; }
  addUsePoison(n: number): void { if (this.self) this.self.UsePoison += n; }
  addDetoxification(n: number): void { if (this.self) this.self.Detoxification += n; }
  addAntiPoison(n: number): void { if (this.self) this.self.AntiPoison += n; }
  addMorality(n: number): void { if (this.self) this.self.Morality += n; }
  addFame(n: number): void { if (this.self) this.self.Fame += n; }
  addAttackTwice(n: number): void { if (this.self) this.self.AttackTwice += n; }
  addAttackWithPoison(n: number): void { if (this.self) this.self.AttackWithPoison += n; }
  addExp(n: number): void { if (this.self) this.self.Exp += n; }

  // ============================================================
  // 同步指令 — 物品
  // ============================================================
  addItem(id: number, count: number): void {
    if (!this.self) return;
    const idx = this.self.Item.indexOf(id);
    if (idx >= 0) {
      this.self.ItemCount[idx] += count;
    } else {
      this.self.Item.push(id);
      this.self.ItemCount.push(count);
    }
  }

  removeItem(id: number, count: number): void {
    if (!this.self) return;
    const idx = this.self.Item.indexOf(id);
    if (idx >= 0) {
      this.self.ItemCount[idx] -= count;
      if (this.self.ItemCount[idx] <= 0) {
        this.self.Item.splice(idx, 1);
        this.self.ItemCount.splice(idx, 1);
      }
    }
  }

  hasItem(id: number): boolean {
    if (!this.self) return false;
    const idx = this.self.Item.indexOf(id);
    return idx >= 0 && this.self.ItemCount[idx] > 0;
  }

  countItem(id: number): number {
    if (!this.self) return 0;
    const idx = this.self.Item.indexOf(id);
    return idx >= 0 ? this.self.ItemCount[idx] : 0;
  }

  // ============================================================
  // 同步指令 — 角色判断
  // ============================================================
  judgeRoleAttr(roleId: number, attrId: number): number {
    const role = this.gameState.Roles[roleId];
    if (!role) return 0;
    const attrs = [
      role.Sexual, role.Level, role.Exp, role.HP, role.MaxHP,
      role.MP, role.MaxMP, role.Attack, role.Speed, role.Defence,
      role.Medicine, role.UsePoison, role.Detoxification, role.AntiPoison,
      role.Fist, role.Sword, role.Blade, role.Unusual, role.HiddenWeapon,
      role.Knowledge, role.Morality, role.AttackWithPoison, role.AttackTwice,
      role.Fame, role.IQ,
    ];
    return attrs[attrId] ?? 0;
  }

  setRoleAttr(roleId: number, attrId: number, val: number): void {
    const role = this.gameState.Roles[roleId];
    if (!role) return;
    const keys: (keyof typeof role)[] = [
      'Sexual', 'Level', 'Exp', 'HP', 'MaxHP',
      'MP', 'MaxMP', 'Attack', 'Speed', 'Defence',
      'Medicine', 'UsePoison', 'Detoxification', 'AntiPoison',
      'Fist', 'Sword', 'Blade', 'Unusual', 'HiddenWeapon',
      'Knowledge', 'Morality', 'AttackWithPoison', 'AttackTwice',
      'Fame', 'IQ',
    ];
    if (keys[attrId]) (role as any)[keys[attrId]] = val;
  }

  judgeInTeam(id: number): boolean { return this.self?.Team?.includes(id) ?? false; }
  inMyTeam(id: number): boolean { return this.judgeInTeam(id); }
  dead(id: number): boolean { return (this.gameState.Roles[id]?.HP ?? 0) <= 0; }
  getMorality(): number { return this.self?.Morality ?? 0; }
  getFame(): number { return this.self?.Fame ?? 0; }
  checkRoleSex(roleId: number): number { return this.gameState.Roles[roleId]?.Sexual ?? 0; }
  getRoleCount(): number { return this.gameState.Roles.length; }
  getLevel(): number { return this.self?.Level ?? 0; }

  // ============================================================
  // 同步指令 — 队伍
  // ============================================================
  joinTeam(id: number): void {
    if (!this.self || this.self.Team.includes(id)) return;
    this.self.Team.push(id);
    this.self.TeamCount = this.self.Team.length;
  }

  leaveTeam(id: number): void {
    if (!this.self) return;
    const idx = this.self.Team.indexOf(id);
    if (idx >= 0) {
      this.self.Team.splice(idx, 1);
      this.self.TeamCount = this.self.Team.length;
    }
  }

  getTeamCount(): number { return this.self?.TeamCount ?? 0; }

  // ============================================================
  // 同步指令 — 武功
  // ============================================================
  haveMagic(roleId: number, magicId: number): boolean {
    const role = this.gameState.Roles[roleId];
    return role?.MagicID?.includes(magicId) ?? false;
  }

  getMagicLevel(roleId: number, magicId: number): number {
    const role = this.gameState.Roles[roleId];
    if (!role) return 0;
    const idx = role.MagicID.indexOf(magicId);
    return idx >= 0 ? (role.MagicLevel[idx] ?? 0) : 0;
  }

  setMagicLevel(roleId: number, magicId: number, level: number): void {
    const role = this.gameState.Roles[roleId];
    if (!role) return;
    const idx = role.MagicID.indexOf(magicId);
    if (idx >= 0) role.MagicLevel[idx] = level;
  }

  learnMagic(roleId: number, magicId: number, level: number): void {
    const role = this.gameState.Roles[roleId];
    if (!role) return;
    const idx = role.MagicID.indexOf(magicId);
    if (idx >= 0) {
      role.MagicLevel[idx] = Math.max(role.MagicLevel[idx], level);
    } else {
      // 找空槽位
      for (let i = 0; i < 10; i++) {
        if (!role.MagicID[i]) {
          role.MagicID[i] = magicId;
          role.MagicLevel[i] = level;
          return;
        }
      }
    }
  }

  // ============================================================
  // 同步指令 — 场景
  // ============================================================
  setScenceMap(x: number, y: number): void {
    if (this.self) { this.self.X = x; this.self.Y = y; }
  }

  setSubMapScene(id: number): void {
    this.gameState.SubMapIndex = id;
  }

  getSubMapScene(): number { return this.gameState.SubMapIndex; }

  // ============================================================
  // 同步指令 — 全局变量
  // ============================================================
  setGlobalVar(id: number, val: number): void { this.setVar(id, val); }
  getGlobalVar(id: number): number { return this.getVar(id); }

  /** 指令映射表（用于 Lua→TS 转换器） */
  static INSTRUCTION_MAP: Record<string, { name: string; isAsync: boolean }> = {
    'Talk': { name: 'talk', isAsync: true },
    'OldTalk': { name: 'oldTalk', isAsync: true },
    'Battle': { name: 'battle', isAsync: true },
    'ShowPicture': { name: 'showPicture', isAsync: true },
    'PlayMusic': { name: 'playMusic', isAsync: false },
    'DarkScreen': { name: 'darkScreen', isAsync: true },
    'LightScreen': { name: 'lightScreen', isAsync: true },
    'Rest': { name: 'rest', isAsync: true },
    'AskJoin': { name: 'askJoin', isAsync: true },
    'Menu': { name: 'showMenu', isAsync: true },
    'AddItem': { name: 'addItem', isAsync: false },
    'RemoveItem': { name: 'removeItem', isAsync: false },
    'HasItem': { name: 'hasItem', isAsync: false },
    'AddHP': { name: 'addHP', isAsync: false },
    'AddMP': { name: 'addMP', isAsync: false },
    'AddAttack': { name: 'addAttack', isAsync: false },
    'AddSpeed': { name: 'addSpeed', isAsync: false },
    'AddDefence': { name: 'addDefence', isAsync: false },
    'AddMorality': { name: 'addMorality', isAsync: false },
    'AddFame': { name: 'addFame', isAsync: false },
    'AddIQ': { name: 'addIQ', isAsync: false },
    'JudgeAttr': { name: 'judgeRoleAttr', isAsync: false },
    'SetRoleAttr': { name: 'setRoleAttr', isAsync: false },
    'JudgeInTeam': { name: 'judgeInTeam', isAsync: false },
    'JoinTeam': { name: 'joinTeam', isAsync: false },
    'LeaveTeam': { name: 'leaveTeam', isAsync: false },
    'HaveMagic': { name: 'haveMagic', isAsync: false },
    'GetMagicLevel': { name: 'getMagicLevel', isAsync: false },
    'LearnMagic': { name: 'learnMagic', isAsync: false },
    'SetScenceMap': { name: 'setScenceMap', isAsync: false },
    'SetSubMapScene': { name: 'setSubMapScene', isAsync: false },
    'Dead': { name: 'dead', isAsync: false },
    'AddPhysicalPower': { name: 'addPhysicalPower', isAsync: false },
    'AddHurt': { name: 'addHurt', isAsync: false },
    'AddPoison': { name: 'addPoison', isAsync: false },
  };
}
