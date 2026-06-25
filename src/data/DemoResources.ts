import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { GameState } from '../data/Types';
import { createEmptyGameState } from '../data/Types';

/**
 * DemoResourceGenerator — 当没有原始游戏资源时，生成演示用资源
 * 可生成：简单地图、随机角色、基础物品
 */
export class DemoResourceGenerator {
  /** 生成演示用的空白游戏状态 */
  static generateDemoGameState(): GameState {
    const state = createEmptyGameState();

    // 生成主角
    state.Roles = [{
      ID: 0, Name: '小虾米', Nick: '', Sexual: 0, HeadID: 0,
      IncLevel: 1, Level: 5, Exp: 0, HP: 150, MaxHP: 150,
      MP: 80, MaxMP: 80, Hurt: 0, Poison: 0, PhysicalPower: 100,
      Attack: 30, Defence: 25, Speed: 20, Medicine: 10,
      UsePoison: 5, Detoxification: 5, AntiPoison: 5,
      Fist: 20, Sword: 15, Blade: 10, Unusual: 5, HiddenWeapon: 5,
      Knowledge: 10, Morality: 50, AttackWithPoison: 0,
      AttackTwice: 0, Fame: 0, IQ: 60, MPType: 0,
      MagicID: new Array(10).fill(0),
      MagicLevel: new Array(10).fill(0),
      Equip: [0, 0], Equip0: 0, Equip1: 0,
      Item: [], ItemCount: [],
      PracticeItem: -1, TakingItem: -1, PracticeMagic: -1,
      TakingItemExp: 0, PracticeMagicExp: 0,
      X: 230, Y: 220, SubMapX: 0, SubMapY: 0, Face: 2, Pic: 0,
      Team: [0], TeamCount: 1,
      InShip: 0, ShipX: 0, ShipY: 0, ShipFace: 0,
    }];

    // 生成几个示例物品
    state.Items = [
      { ID: 1, Name: '金疮药', Introduction: '恢复生命50点', ItemType: 0, Price: 50,
        AddHP: 50, AddMP: 0, AddPhysicalPower: 0, AddHurt: -5, AddPoison: 0,
        AddAttack: 0, AddSpeed: 0, AddDefence: 0, ChangeMPType: 0, NeedMPType: 0,
        NeedAttack: 0, NeedSpeed: 0, NeedFist: 0, NeedSword: 0, NeedBlade: 0,
        NeedUnusual: 0, NeedIQ: 0, NeedExp: 0, NeedMP: 0, MagicID: 0,
        AddAttackWithPoison: 0, OnlySomeone: 0, OnlySomeoneCode: 0,
        MakeItem: [], MakeItemCount: [] },
    ];

    // 生成几个示例武功
    state.Magics = [
      { ID: 1, Name: '野球拳', Introduction: '基础拳法', MagicType: 1, SoundID: 0,
        AttackAreaType: 0, AttackArea: [0], NeedMP: new Array(10).fill(5),
        Poison: new Array(10).fill(0), Hurt: new Array(10).fill(10),
        KillMP: 0, AddMP: 0, AttackTwiceChance: 0, UserDefence: 0,
        NeedExp: new Array(10).fill(100), NeedAttack: 0, NeedSpeed: 0,
        NeedFist: 10, NeedSword: 0, NeedBlade: 0, NeedUnusual: 0,
        NeedIQ: 0, NeedMPType: 0, AttachMagic: 0 },
    ];

    // 生成演示大地图（480×480，中心区域可走）
    const W = 480, H = 480;
    const earth = Array.from({ length: H }, () => new Array(W).fill(0));
    const surface = Array.from({ length: H }, () => new Array(W).fill(0));
    const building = Array.from({ length: H }, () => new Array(W).fill(0));

    // 中心区域标记为可走（值为1）
    for (let y = 100; y < 380; y++) {
      for (let x = 100; x < 380; x++) {
        earth[y][x] = 1;
      }
    }

    state.MainMap = { earth, surface, building, width: W, height: H };
    state.SelfIndex = 0;
    state.TeamIndex = [0];

    return state;
  }

  /** 生成演示用的子场景（10×10 可走区域） */
  static generateDemoSubMap(id: number) {
    return {
      ID: id, Name: `演示场景${id}`, ExitMusic: 0, EnterMusic: 0,
      JumpX: 230, JumpY: 220, MainMapX: 230, MainMapY: 220,
      EarthSurface: new Array(64 * 64).fill(0),
      Surface: 0, Building: 0, BuildX: 0, BuildY: 0,
      Events: new Array(64 * 64).fill(0), EventCount: 0,
    };
  }

  /** 创建演示用的标题纹理（纯色方块 + 文字） */
  static createDemoTitleTexture(g: Graphics, w: number, h: number): void {
    g.clear();
    // 深色背景
    g.rect(0, 0, w, h);
    g.fill({ color: 0x0a0a1a });

    // 装饰边框
    g.rect(20, 20, w - 40, h - 40);
    g.stroke({ color: 0x886633, width: 2 });

    // 中间分隔线
    g.moveTo(w / 2, 40);
    g.lineTo(w / 2, h - 40);
    g.stroke({ color: 0x886633, alpha: 0.3, width: 1 });
  }
}
