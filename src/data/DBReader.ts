import { AssetLoader } from '../engine/AssetLoader';
import type { RoleSave, ItemSave, MagicSave, SubMapInfoSave, ShopSave, MainMapData, GameState } from './Types';
import { createEmptyGameState } from './Types';

/** 数据库原始行数据 */
interface DBRawRow { [key: string]: any; }

export class DBReader {
  private static instance: DBReader;
  static getInstance(): DBReader {
    if (!DBReader.instance) DBReader.instance = new DBReader();
    return DBReader.instance;
  }

  private data: { role?: DBRawRow[]; item?: DBRawRow[]; magic?: DBRawRow[]; shop?: DBRawRow[] } = {};
  private loaded = false;
  get isLoaded(): boolean { return this.loaded; }

  /** 从预生成的 JSON 加载游戏数据（无需 WASM） */
  async loadJson(url: string): Promise<void> {
    const text = await AssetLoader.getInstance().loadText(url);
    this.data = JSON.parse(text);
    this.loaded = true;
    console.log(`[DB] JSON loaded: ${this.data.role?.length || 0} roles`);
  }

  // ============================================================
  // 数据读取
  // ============================================================

  readAllRoles(): RoleSave[] {
    if (!this.data.role) return [];
    return this.data.role.map(r => ({
      ID: r['编号'] ?? 0,
      Name: r['名字'] ?? '',
      Nick: r['外号'] ?? '',
      Sexual: r['性别'] ?? 0,
      HeadID: r['头像'] ?? 0,
      IncLevel: r['等级'] ?? 1,
      Level: r['等级'] ?? 1,
      Exp: r['经验'] ?? 0,
      HP: r['生命'] ?? 0,
      MaxHP: r['生命最大值'] ?? 0,
      MP: r['内力'] ?? 0,
      MaxMP: r['内力最大值'] ?? 0,
      Hurt: r['内伤'] ?? 0,
      Poison: r['中毒'] ?? 0,
      PhysicalPower: r['体力'] ?? 100,
      Attack: r['攻击力'] ?? 0,
      Defence: r['防御力'] ?? 0,
      Speed: r['轻功'] ?? 0,
      Medicine: r['医疗'] ?? 0,
      UsePoison: r['用毒'] ?? 0,
      Detoxification: r['解毒'] ?? 0,
      AntiPoison: r['抗毒'] ?? 0,
      Fist: r['拳掌'] ?? 0,
      Sword: r['御剑'] ?? 0,
      Blade: r['耍刀'] ?? 0,
      Unusual: r['特殊'] ?? 0,
      HiddenWeapon: r['暗器'] ?? 0,
      Knowledge: r['武学常识'] ?? 0,
      Morality: r['品德'] ?? 50,
      AttackWithPoison: r['攻击带毒'] ?? 0,
      AttackTwice: r['左右互搏'] ?? 0,
      Fame: r['声望'] ?? 0,
      IQ: r['资质'] ?? 50,
      MPType: r['内力性质'] ?? 0,
      MagicID: [r['所会武功1'], r['所会武功2'], r['所会武功3'], r['所会武功4'], r['所会武功5'],
                 r['所会武功6'], r['所会武功7'], r['所会武功8'], r['所会武功9'], r['所会武功10']].map(Number).filter(Boolean),
      MagicLevel: [r['武功等级1'], r['武功等级2'], r['武功等级3'], r['武功等级4'], r['武功等级5'],
                    r['武功等级6'], r['武功等级7'], r['武功等级8'], r['武功等级9'], r['武功等级10']].map(Number),
      Item: [r['携带物品1'], r['携带物品2'], r['携带物品3'], r['携带物品4']].map(Number).filter(v => v > 0),
      ItemCount: [r['携带物品数量1'], r['携带物品数量2'], r['携带物品数量3'], r['携带物品数量4']].map(Number).filter(v => v > 0),
      Equip0: r['武器'] ?? -1,
      Equip1: r['防具'] ?? -1,
      Equip: [r['武器'] ?? -1, r['防具'] ?? -1],
      PracticeItem: r['修炼物品'] ?? -1,
      TakingItem: r['修炼物品'] ?? -1,
      PracticeMagic: r['装备武功1'] ?? 0,
      TakingItemExp: r['物品修炼点数'] ?? 0,
      PracticeMagicExp: r['修炼点数'] ?? 0,
      X: 230, Y: 220, SubMapX: 0, SubMapY: 0, Face: 2, Pic: 0,
      Team: [], TeamCount: 0,
      InShip: 0, ShipX: 0, ShipY: 0, ShipFace: 0,
    }));
  }

  readAllItems(): ItemSave[] {
    if (!this.data.item) return [];
    return this.data.item.map(r => ({
      ID: r['编号'] ?? 0,
      Name: r['物品名'] ?? '',
      Introduction: r['物品说明'] ?? '',
      ItemType: r['物品类型'] ?? 0,
      Price: r['物品价格1'] ?? 0,
      AddHP: r['加生命'] ?? 0,
      AddMP: r['加内力'] ?? 0,
      AddPhysicalPower: r['加体力'] ?? 0,
      AddHurt: 0,
      AddPoison: r['加中毒解毒'] ?? 0,
      AddAttack: r['加攻击力'] ?? 0,
      AddSpeed: r['加轻功'] ?? 0,
      AddDefence: r['加防御力'] ?? 0,
      ChangeMPType: r['改变内力性质'] ?? 0,
      NeedMPType: r['需内力性质'] ?? 0,
      NeedAttack: r['需攻击力'] ?? 0,
      NeedSpeed: r['需轻功'] ?? 0,
      NeedFist: r['需拳掌'] ?? 0,
      NeedSword: r['需御剑'] ?? 0,
      NeedBlade: r['需耍刀'] ?? 0,
      NeedUnusual: r['需特殊兵器'] ?? 0,
      NeedIQ: r['需资质'] ?? 0,
      NeedExp: r['需经验'] ?? 0,
      NeedMP: r['需内力'] ?? 0,
      MagicID: r['练出武功'] ?? 0,
      AddAttackWithPoison: r['加攻击带毒'] ?? 0,
      OnlySomeone: r['仅修炼人物'] ?? 0,
      OnlySomeoneCode: r['使用人'] ?? 0,
      MakeItem: [r['练出物品1'], r['练出物品2'], r['练出物品3'], r['练出物品4'], r['练出物品5']].map(Number).filter(v => v > 0),
      MakeItemCount: [r['练出物品数量1'], r['练出物品数量2'], r['练出物品数量3'], r['练出物品数量4'], r['练出物品数量5']].map(Number).filter(v => v > 0),
    }));
  }

  readAllMagics(): MagicSave[] {
    if (!this.data.magic) return [];
    return this.data.magic.map(r => ({
      ID: r['编号'] ?? 0,
      Name: r['名称'] ?? '',
      Introduction: '',
      MagicType: r['武功类型'] ?? 0,
      SoundID: r['出招音效'] ?? 0,
      AttackAreaType: r['攻击范围类型'] ?? 0,
      AttackArea: [r['杀伤范围1'], r['杀伤范围2'], r['杀伤范围3'], r['杀伤范围4'], r['杀伤范围5'],
                    r['杀伤范围6'], r['杀伤范围7'], r['杀伤范围8'], r['杀伤范围9'], r['杀伤范围10']].map(Number).filter(v => !isNaN(v)),
      NeedMP: new Array(10).fill(r['消耗内力'] ?? 0),
      Poison: new Array(10).fill(r['敌人中毒'] ?? 0),
      Hurt: [r['威力1'], r['威力2'], r['威力3'], r['威力4'], r['威力5'],
             r['威力6'], r['威力7'], r['威力8'], r['威力9'], r['威力10']].map(Number),
      KillMP: r['杀伤内力1'] ?? 0,
      AddMP: r['加内力1'] ?? 0,
      AttackTwiceChance: 0,
      UserDefence: 0,
      NeedExp: new Array(10).fill(0),
      NeedAttack: 0, NeedSpeed: 0, NeedFist: 0, NeedSword: 0,
      NeedBlade: 0, NeedUnusual: 0, NeedIQ: 0, NeedMPType: 0, AttachMagic: 0,
    }));
  }

  readAllShops(): ShopSave[] {
    if (!this.data.shop) return [];
    return this.data.shop.map((r, i) => ({
      ID: i,
      Name: '商店',
      ItemID: [r['物品编号1'], r['物品编号2'], r['物品编号3'], r['物品编号4'], r['物品编号5']].map(Number).filter(v => v > 0),
      ItemCount: [r['物品总量1'], r['物品总量2'], r['物品总量3'], r['物品总量4'], r['物品总量5']].map(Number).filter(v => v > 0),
    }));
  }

  async createGameState(jsonPath: string): Promise<GameState> {
    await this.loadJson(jsonPath);
    const state = createEmptyGameState();
    state.Roles = this.readAllRoles();
    state.Items = this.readAllItems();
    state.Magics = this.readAllMagics();
    state.Shops = this.readAllShops();
    state.SelfIndex = 0;
    state.TeamIndex = [0];
    console.log(`[DB] Loaded: ${state.Roles.length} roles, ${state.Items.length} items, ${state.Magics.length} magics`);
    return state;
  }
}
