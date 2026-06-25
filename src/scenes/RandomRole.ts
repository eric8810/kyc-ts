import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { InputManager } from '../engine/InputManager';
import type { GameState, RoleSave } from '../data/Types';
import { createDefaultRoleSave } from '../data/Types';

/**
 * RandomRole — 随机角色生成界面
 */
export class RandomRole extends RunNode {
  private gameState!: GameState;
  private role!: RoleSave;
  private rolling = false;
  private rollCount = 0;
  private maxRolls = 3; // 可重新摇3次

  constructor() {
    super();
    this.label = 'RandomRole';
    this._fullWindow = 1;
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  override onEntrance(): void {
    this.roll();
    this.drawUI();
  }

  /** 随机生成角色属性 */
  roll(): void {
    this.role = createDefaultRoleSave(0);
    this.role.Name = '小虾米';
    this.role.Level = 1;

    // 随机属性
    this.role.IQ = 30 + Math.floor(Math.random() * 70);
    this.role.Morality = 20 + Math.floor(Math.random() * 60);

    const baseAttr = 10 + Math.floor(Math.random() * 20);
    this.role.Attack = baseAttr + Math.floor(Math.random() * 15);
    this.role.Defence = baseAttr - 5 + Math.floor(Math.random() * 10);
    this.role.Speed = baseAttr + Math.floor(Math.random() * 15);
    this.role.Fist = 15 + Math.floor(Math.random() * 20);
    this.role.Sword = 10 + Math.floor(Math.random() * 25);
    this.role.Blade = 10 + Math.floor(Math.random() * 25);
    this.role.Unusual = 5 + Math.floor(Math.random() * 30);
    this.role.Medicine = 5 + Math.floor(Math.random() * 25);
    this.role.UsePoison = 3 + Math.floor(Math.random() * 15);

    this.role.MaxHP = 100 + this.role.Level * 20;
    this.role.HP = this.role.MaxHP;
    this.role.MaxMP = 50 + this.role.Level * 10;
    this.role.MP = this.role.MaxMP;
    this.role.PhysicalPower = 100;

    this.rollCount++;
  }

  private drawUI(): void {
    this.removeChildren();
    const engine = Engine.getInstance();
    const g = new Graphics();

    // 背景
    g.rect(0, 0, engine.uiWidth, engine.uiHeight);
    g.fill({ color: 0x1a1530 });
    this.addChild(g);

    // 标题
    const title = new Text({
      text: '选择角色属性',
      style: new TextStyle({ fontFamily: 'SimHei, serif', fontSize: 36, fill: 0xffcc00 }),
    });
    title.anchor.set(0.5);
    title.x = engine.uiWidth / 2;
    title.y = 60;
    this.addChild(title);

    // 角色属性显示
    const attrs = [
      `姓名: ${this.role.Name}`,
      `资质: ${this.role.IQ}`,
      `攻击: ${this.role.Attack}  防御: ${this.role.Defence}`,
      `轻功: ${this.role.Speed}`,
      `拳掌: ${this.role.Fist}  剑法: ${this.role.Sword}`,
      `刀法: ${this.role.Blade}  特殊: ${this.role.Unusual}`,
      `医疗: ${this.role.Medicine}  用毒: ${this.role.UsePoison}`,
      `道德: ${this.role.Morality}`,
      `剩余重选次数: ${this.maxRolls - this.rollCount}`,
    ];

    for (let i = 0; i < attrs.length; i++) {
      const color = attrs[i].includes('重选次数') ? 0xffaa00 : 0xffffff;
      const t = new Text({
        text: attrs[i],
        style: new TextStyle({ fontFamily: 'SimHei, serif', fontSize: 22, fill: color }),
      });
      t.anchor.set(0.5);
      t.x = engine.uiWidth / 2;
      t.y = 150 + i * 40;
      this.addChild(t);
    }

    // 按钮提示
    const hint = new Text({
      text: '[Enter] 确定   [Space] 重新选择   [Esc] 返回',
      style: new TextStyle({ fontFamily: 'SimHei, serif', fontSize: 16, fill: 0x888888 }),
    });
    hint.anchor.set(0.5);
    hint.x = engine.uiWidth / 2;
    hint.y = engine.uiHeight - 80;
    this.addChild(hint);
  }

  override backRun(): void {
    const input = InputManager.getInstance();

    if (input.isKeyPressed('Space') && this.rollCount < this.maxRolls) {
      this.roll();
      this.drawUI();
    }
    if (input.isKeyPressed('Enter')) {
      this.confirm();
    }
    if (input.isKeyPressed('Escape')) {
      this.exitWithResult(-1);
    }
  }

  private confirm(): void {
    // 将角色写入 gameState
    this.gameState.Roles[0] = this.role;
    this.gameState.SelfIndex = 0;
    console.log('[RandomRole] 确认角色:', this.role.Name, this.role.IQ, this.role.Attack);
    this.exitWithResult(0);
  }
}
