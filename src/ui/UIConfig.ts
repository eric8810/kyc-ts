import { Graphics, Text } from 'pixi.js';
import { RunNode } from '../core/RunNode';
import { Engine } from '../engine/Engine';
import { AudioManager } from '../engine/AudioManager';
import { InputManager } from '../engine/InputManager';

/**
 * UIConfig — 游戏设置界面
 */
export class UIConfig extends RunNode {
  private musicVol = 0.2;
  private soundVol = 0.5;
  private fullscreen = false;
  private selectedRow = 0;

  constructor() {
    super();
    this.label = 'UIConfig';
    const audio = AudioManager.getInstance();
    this.musicVol = audio.getMusicVolume();
    this.soundVol = audio.getSoundVolume();
    this.updateView();
  }

  private updateView(): void {
    this.removeChildren();
    const engine = Engine.getInstance();

    const title = engine.createText('游戏设置', 24, 0xffcc66);
    title.x = 20; title.y = 15;
    this.addChild(title);

    const options = [
      { label: `音乐音量: ${this.barStr(this.musicVol)}`, y: 70 },
      { label: `音效音量: ${this.barStr(this.soundVol)}`, y: 110 },
      { label: `全屏: ${this.fullscreen ? '开启' : '关闭'}`, y: 150 },
    ];

    options.forEach((opt, i) => {
      const t = engine.createText(opt.label, 16, i === this.selectedRow ? 0xffcc66 : 0xcccccc);
      t.x = 40; t.y = opt.y;
      this.addChild(t);
    });
  }

  private barStr(val: number): string {
    const n = Math.round(val * 10);
    return '█'.repeat(n) + '░'.repeat(10 - n) + ` ${Math.round(val * 100)}%`;
  }

  selectUp(): void { this.selectedRow = Math.max(0, this.selectedRow - 1); this.updateView(); }
  selectDown(): void { this.selectedRow = Math.min(2, this.selectedRow + 1); this.updateView(); }

  adjustValue(dir: number): void {
    const audio = AudioManager.getInstance();
    switch (this.selectedRow) {
      case 0:
        this.musicVol = Math.max(0, Math.min(1, this.musicVol + dir * 0.1));
        audio.setMusicVolume(this.musicVol);
        break;
      case 1:
        this.soundVol = Math.max(0, Math.min(1, this.soundVol + dir * 0.1));
        audio.setSoundVolume(this.soundVol);
        break;
      case 2:
        if (dir !== 0) {
          this.fullscreen = !this.fullscreen;
          // toggle fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.body.requestFullscreen();
          }
        }
        break;
    }
    this.updateView();
  }

  override backRun(): void {
    const input = InputManager.getInstance();
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) this.selectUp();
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) this.selectDown();
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA')) this.adjustValue(-1);
    if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD') || input.isKeyPressed('Enter') || input.isKeyPressed('Space')) this.adjustValue(1);
    if (input.isKeyPressed('Escape')) this.exitWithResult(0);
  }
}
