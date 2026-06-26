import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { SaveManager } from '../data/SaveManager';
import { InputManager } from '../engine/InputManager';
import type { GameState } from '../data/Types';

/**
 * UISave — 存档界面
 * 3 个存档槽 + 时间显示
 * 对应 C++ UISave.cpp + NewSave.h
 */
export class UISave extends RunNode {
  private selectedSlot = 0;
  private saveSlots: { slot: number; timestamp: number }[] = [];
  private mode: 'save' | 'load' = 'save';
  private onSlotSelected: ((slot: number) => void) | null = null;

  constructor(mode: 'save' | 'load' = 'save') {
    super();
    this.label = 'UISave';
    this.mode = mode;
  }

  async loadSlots(): Promise<void> {
    const saveManager = SaveManager.getInstance();
    this.saveSlots = await saveManager.listSaves();
    this.drawSlots();
  }

  private drawSlots(): void {
    this.removeChildren();
    const engine = Engine.getInstance();

    const title = engine.createText(this.mode === 'save' ? '保存进度' : '读取进度', 24, 0xffcc66);
    title.x = 20; title.y = 15;
    this.addChild(title);

    for (let i = 0; i < 3; i++) {
      const y = 60 + i * 120;
      const selected = i === this.selectedSlot;
      const slotData = this.saveSlots.find(s => s.slot === i);

      const bg = new Graphics();
      bg.roundRect(20, y, 400, 100, 6);
      bg.fill({ color: selected ? 0x3a3a5a : 0x1a1a2e });
      bg.roundRect(20, y, 400, 100, 6);
      bg.stroke({ color: selected ? 0xffcc66 : 0x444466, width: 2 });
      this.addChild(bg);

      const slotLabel = engine.createText(`存档 ${i + 1}`, 18, selected ? 0xffcc66 : 0xcccccc);
      slotLabel.x = 35; slotLabel.y = y + 10;
      this.addChild(slotLabel);

      if (slotData) {
        const date = new Date(slotData.timestamp);
        const timeStr = engine.createText(date.toLocaleString(), 14, 0x888888);
        timeStr.x = 35; timeStr.y = y + 40;
        this.addChild(timeStr);
      } else {
        const empty = engine.createText('（空）', 14, 0x666666);
        empty.x = 35; empty.y = y + 40;
        this.addChild(empty);
      }
    }

    const hint = engine.createText('↑↓ 选择  Enter 确认  ESC 返回', 13, 0x666688);
    hint.x = 20; hint.y = 430;
    this.addChild(hint);
  }

  selectUp(): void { this.selectedSlot = Math.max(0, this.selectedSlot - 1); this.drawSlots(); }
  selectDown(): void { this.selectedSlot = Math.min(2, this.selectedSlot + 1); this.drawSlots(); }

  async confirm(): Promise<void> {
    if (this.onSlotSelected) {
      this.onSlotSelected(this.selectedSlot);
    }
    this.exitWithResult(this.selectedSlot);
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) this.selectUp();
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) this.selectDown();
    if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) void this.confirm();
    if (input.isKeyPressed('Escape')) this.exitWithResult(-1);
  }
}
