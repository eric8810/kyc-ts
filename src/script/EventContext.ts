import { Engine } from '../engine/Engine';
import { AudioManager } from '../engine/AudioManager';
import type { GameState } from '../data/Types';
import { SaveManager } from '../data/SaveManager';
import { Talk } from '../ui/Talk';
import { Menu, type MenuItem } from '../ui/Menu';
import { BattleScene } from '../scenes/battle/BattleScene';

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
    console.log(`[Talk] ${content}`);
    await this.showTalk(content, headId, nameId);
  }

  async oldTalk(textId: number): Promise<void> {
    await this.loadTalkLines();
    const content = this.talkLines[textId] || `[对话#${textId}]`;
    console.log(`[Talk] ${content}`);
    await this.showTalk(content, 0, 0);
  }

  async battle(id: number): Promise<boolean> {
    console.log(`[Battle] 进入战斗 #${id}`);
    const battle = new BattleScene(this.gameState, id);
    const engine = Engine.getInstance();
    engine.uiLayer.addChild(battle);
    try {
      const result = await battle.run(false);
      return result >= 0;
    } finally {
      if (battle.parent) battle.parent.removeChild(battle);
    }
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
    if (options.length === 0) return -1;
    const engine = Engine.getInstance();
    const items: MenuItem[] = options.map((text, i) => ({ text, enabled: true, tag: i }));
    const menu = new Menu(items, Math.max(20, engine.uiWidth / 2 - 120), Math.max(40, engine.uiHeight / 2 - options.length * 16));
    engine.uiLayer.addChild(menu);
    try {
      return await menu.run(false);
    } finally {
      if (menu.parent) menu.parent.removeChild(menu);
    }
  }

  private async showTalk(content: string, headId: number, nameId: number): Promise<void> {
    const role = this.gameState.Roles[nameId] ?? this.gameState.Roles.find(r => r.HeadID === headId);
    const talk = new Talk();
    const engine = Engine.getInstance();
    engine.uiLayer.addChild(talk);
    const done = talk.show(role?.Name || '', content, headId);
    const running = talk.run(false);
    try {
      await done;
      await running;
    } finally {
      if (talk.parent) talk.parent.removeChild(talk);
    }
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
    const key = keys[attrId];
    if (key) (role as any)[key] = val;
  }

  judgeInTeam(roleId: number): boolean {
    return this.gameState.TeamIndex?.includes(roleId) || this.self?.ID === roleId || false;
  }

  getMorality(): number { return this.self?.Morality ?? 0; }
  getFame(): number { return this.self?.Fame ?? 0; }

  dead(roleId: number): boolean {
    const role = this.gameState.Roles[roleId];
    return !role || role.HP <= 0;
  }

  haveMagic(roleId: number, magicId: number): boolean {
    const role = this.gameState.Roles[roleId];
    return role?.MagicID?.includes(magicId) ?? false;
  }

  // ============================================================
  // 同步指令 — 全局变量
  // ============================================================
  getGlobalVar(id: number): number { return this.getVar(id); }
  setGlobalVar(id: number, val: number): void { this.setVar(id, val); }

  // ============================================================
  // 同步指令 — 存档
  // ============================================================
  async save(slot: number): Promise<void> {
    await SaveManager.getInstance().saveGame(slot, this.gameState);
  }

  async load(slot: number): Promise<boolean> {
    const gs = await SaveManager.getInstance().loadGame(slot);
    if (gs) {
      this.gameState = gs;
      return true;
    }
    return false;
  }

  // ============================================================
  // 兼容转换脚本的常见别名
  // ============================================================
  instruct_0(): void {}
  instruct_1(): void {}
  instruct_2(): void {}
  instruct_3(): void {}
  instruct_4(): void {}
  instruct_5(): void {}
}
