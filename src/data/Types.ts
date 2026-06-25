// ============================================================
// Types.ts — 金庸群侠传 全部游戏数据结构（从 Types.h 1:1 映射）
// ============================================================

/** 角色基础属性（存档持久化部分） */
export interface RoleSave {
  ID: number;              // 角色编号
  Name: string;            // 姓名
  Nick: string;            // 外号
  Sexual: number;          // 性别 0男 1女 2其他
  HeadID: number;          // 头像编号
  IncLevel: number;        // 出场等级
  Level: number;           // 当前等级
  Exp: number;             // 经验值
  HP: number;              // 当前生命
  MaxHP: number;           // 最大生命
  MP: number;              // 当前内力
  MaxMP: number;           // 最大内力
  Hurt: number;            // 受伤程度
  Poison: number;          // 中毒程度
  PhysicalPower: number;   // 体力
  Attack: number;          // 攻击力
  Defence: number;         // 防御力
  Speed: number;           // 轻功
  Medicine: number;        // 医疗
  UsePoison: number;       // 用毒
  Detoxification: number;  // 解毒
  AntiPoison: number;      // 抗毒
  Fist: number;            // 拳掌
  Sword: number;           // 剑法
  Blade: number;           // 刀法
  Unusual: number;         // 特殊兵器
  HiddenWeapon: number;    // 暗器
  Knowledge: number;       // 武学常识
  Morality: number;        // 道德
  AttackWithPoison: number;// 攻击带毒
  AttackTwice: number;     // 左右互搏 0/1
  Fame: number;            // 声望
  IQ: number;              // 资质
  MPType: number;          // 内力属性 0阴 1阳
  MagicID: number[];       // 武功列表 (10个)
  MagicLevel: number[];    // 武功等级 (10个)
  Equip: number[];         // 装备 [武器, 防具]
  Item: number[];          // 物品列表
  ItemCount: number[];     // 物品数量
  Equip0: number;          // 武器
  Equip1: number;          // 防具

  // 战斗相关
  PracticeItem: number;    // 修炼物品
  TakingItem: number;      // 服用物品
  PracticeMagic: number;   // 修炼武功
  TakingItemExp: number;   // 服用物品累计经验
  PracticeMagicExp: number;// 修炼武功累计经验

  // 位置
  X: number;               // 大地图X
  Y: number;               // 大地图Y
  SubMapX: number;         // 子场景X
  SubMapY: number;         // 子场景Y
  Face: number;            // 朝向
  Pic: number;             // 当前贴图

  // 队伍
  Team: number[];          // 队伍成员ID
  TeamCount: number;       // 队伍人数

  // 场景相关
  InShip: number;          // 是否在船上
  ShipX: number;
  ShipY: number;
  ShipFace: number;
}

/** 默认角色属性 */
export function createDefaultRoleSave(id: number = 0): RoleSave {
  return {
    ID: id, Name: '', Nick: '', Sexual: 0, HeadID: 0, IncLevel: 1, Level: 1,
    Exp: 0, HP: 0, MaxHP: 0, MP: 0, MaxMP: 0, Hurt: 0, Poison: 0,
    PhysicalPower: 100, Attack: 0, Defence: 0, Speed: 0, Medicine: 0,
    UsePoison: 0, Detoxification: 0, AntiPoison: 0, Fist: 0, Sword: 0,
    Blade: 0, Unusual: 0, HiddenWeapon: 0, Knowledge: 0, Morality: 50,
    AttackWithPoison: 0, AttackTwice: 0, Fame: 0, IQ: 50, MPType: 0,
    MagicID: new Array(10).fill(0), MagicLevel: new Array(10).fill(0),
    Equip: [0, 0], Item: [], ItemCount: [],
    Equip0: 0, Equip1: 0,
    PracticeItem: -1, TakingItem: -1, PracticeMagic: -1,
    TakingItemExp: 0, PracticeMagicExp: 0,
    X: 0, Y: 0, SubMapX: 0, SubMapY: 0, Face: 0, Pic: 0,
    Team: [], TeamCount: 0,
    InShip: 0, ShipX: 0, ShipY: 0, ShipFace: 0,
  };
}

/** 物品定义 */
export interface ItemSave {
  ID: number;              // 物品编号
  Name: string;            // 名称
  Introduction: string;    // 说明
  ItemType: number;        // 类型: 0药品 1暗器 2武器 3防具 4秘籍
  Price: number;           // 价格
  AddHP: number;           // 加生命
  AddMP: number;           // 加内力
  AddPhysicalPower: number;// 加体力
  AddHurt: number;         // 减受伤
  AddPoison: number;       // 加减中毒
  AddAttack: number;       // 加攻击
  AddSpeed: number;        // 加轻功
  AddDefence: number;      // 加防御
  ChangeMPType: number;    // 改变内力属性
  NeedMPType: number;      // 需要内力属性
  NeedAttack: number;      // 需要攻击
  NeedSpeed: number;       // 需要轻功
  NeedFist: number;        // 需要拳掌
  NeedSword: number;       // 需要剑法
  NeedBlade: number;       // 需要刀法
  NeedUnusual: number;     // 需要特殊
  NeedIQ: number;          // 需要资质
  NeedExp: number;         // 需要经验
  NeedMP: number;          // 需要内力
  MagicID: number;         // 可练出武功
  AddAttackWithPoison: number; // 攻击带毒
  OnlySomeone: number;     // 仅限某人
  OnlySomeoneCode: number; // 某人编号
  MakeItem: number[];      // 炼出物品列表
  MakeItemCount: number[]; // 炼出数量
}

/** 武功定义 */
export interface MagicSave {
  ID: number;              // 武功编号
  Name: string;            // 名称
  Introduction: string;    // 说明
  MagicType: number;       // 类型: 0普通 1拳 2剑 3刀 4特殊 5内功 6吸收
  SoundID: number;         // 音效编号
  AttackAreaType: number;  // 攻击范围类型 0点 1线 2十字 3面
  AttackArea: number[];    // 攻击范围
  NeedMP: number[];        // 每级需要内力 [10级]
  Poison: number[];        // 每级中毒
  Hurt: number[];          // 每级伤害
  KillMP: number;          // 杀内力
  AddMP: number;           // 加内力
  AttackTwiceChance: number;// 连击几率
  UserDefence: number;     // 使用者防御加成
  NeedExp: number[];       // 每级需要经验
  NeedAttack: number;      // 需要攻击
  NeedSpeed: number;       // 需要轻功
  NeedFist: number;        // 需要拳掌
  NeedSword: number;       // 需要剑法
  NeedBlade: number;       // 需要刀法
  NeedUnusual: number;     // 需要特殊
  NeedIQ: number;          // 需要资质
  NeedMPType: number;      // 需要内力属性
  AttachMagic: number;     // 附加武功
}

/** 场景地图信息 */
export interface SubMapInfoSave {
  ID: number;              // 场景编号
  Name: string;            // 名称
  ExitMusic: number;       // 退出音乐
  EnterMusic: number;      // 进入音乐
  JumpX: number;           // 跳转大地图X
  JumpY: number;           // 跳转大地图Y
  MainMapX: number;        // 大地图入口X
  MainMapY: number;        // 大地图入口Y
  EarthSurface: number[];  // 地面层 64*64
  Surface: number;         // 表面层编号
  Building: number;        // 建筑层编号
  BuildX: number;          // 建筑X偏移
  BuildY: number;          // 建筑Y偏移
  Events: number[];        // 事件层 64*64 (200事件索引)
  EventCount: number;      // 事件数量
}

/** 场景事件 */
export interface SubMapEvent {
  ID: number;              // 事件编号
  Type: number;            // 类型: 0经过 1主动 2使用物品 3通过
  TriggerX: number;        // 触发X坐标
  TriggerY: number;        // 触发Y坐标
  TriggerValue: number;    // 触发值(物品ID/暗号等)
  ScriptID: number;        // 脚本编号
  Active: number;          // 是否激活
}

/** 商店信息 */
export interface ShopSave {
  ID: number;
  Name: string;
  ItemID: number[];        // 5个商品
  ItemCount: number[];     // 数量
}

/** 主地图层数据 */
export interface MainMapData {
  earth: number[][];       // 地面层 480x480
  surface: number[][];     // 表面层 480x480
  building: number[][];    // 建筑层 480x480
  width: number;
  height: number;
}

/** 游戏状态 */
export interface GameState {
  Roles: RoleSave[];           // 所有角色(0-999)
  Items: ItemSave[];           // 所有物品
  Magics: MagicSave[];         // 所有武功
  SubMaps: SubMapInfoSave[];   // 所有子场景
  SubMapEvents: SubMapEvent[][];// 每个子场景的事件列表
  Shops: ShopSave[];           // 所有商店
  MainMap: MainMapData;        // 主地图数据
  TeamIndex: number[];         // 队伍成员索引
  SelfIndex: number;           // 主角索引
  SubMapIndex: number;         // 当前子场景编号
  GlobalData: Int32Array;      // 全局变量 x[0..32767]
}

/** 创建空游戏状态 */
export function createEmptyGameState(): GameState {
  return {
    Roles: [],
    Items: [],
    Magics: [],
    SubMaps: [],
    SubMapEvents: [],
    Shops: [],
    MainMap: { earth: [], surface: [], building: [], width: 480, height: 480 },
    TeamIndex: [],
    SelfIndex: 0,
    SubMapIndex: -1,
    GlobalData: new Int32Array(32768),
  };
}

// ============================================================
// 颜色工具
// ============================================================

export interface RGBAColor {
  r: number; g: number; b: number; a: number;
}

export function rgba(r: number, g: number, b: number, a: number = 255): RGBAColor {
  return { r, g, b, a };
}

export function rgbaToHex(c: RGBAColor): number {
  return (c.r << 16) | (c.g << 8) | c.b;
}

export function hexToRgba(hex: number): RGBAColor {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
    a: 255,
  };
}

// ============================================================
// 对齐枚举
// ============================================================

export enum Align {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

// ============================================================
// 常量
// ============================================================

export const TILE_W_0 = 18;
export const TILE_H_0 = 9;

export const ROLE_COUNT = 1000;
export const ITEM_COUNT = 500;
export const MAGIC_COUNT = 200;
export const SUBMAP_COUNT = 500;
