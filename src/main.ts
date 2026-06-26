import { Engine } from './engine/Engine';
import { AssetLoader } from './engine/AssetLoader';
import { ConfigLoader } from './engine/ConfigLoader';
import { AudioManager } from './engine/AudioManager';
import { SaveManager } from './data/SaveManager';
import { DBReader } from './data/DBReader';
import { DemoResourceGenerator } from './data/DemoResources';
import { TitleScene } from './scenes/TitleScene';
import { MainScene } from './scenes/MainScene';
import { SubScene } from './scenes/SubScene';
import { BattleScene } from './scenes/battle/BattleScene';
import { UISystem } from './ui/UISystem';
import { UIItem } from './ui/UIItem';
import { UIStatus } from './ui/UIStatus';
import { TeamMenu } from './ui/TeamMenu';
import { UISave } from './ui/UISave';
import { UIConfig } from './ui/UIConfig';
import { UIKeyConfig } from './ui/UIKeyConfig';
import { UIShop } from './ui/UIShop';
import { createEmptyGameState } from './data/Types';
import type { GameState } from './data/Types';

class Game {
  gameState: GameState = createEmptyGameState();

  async start(): Promise<void> {
    const container = document.getElementById('game-container');
    if (!container) return;

    const engine = Engine.create();
    await engine.init(container);

    const loader = AssetLoader.getInstance();
    loader.setBasePath('game/');
    await loader.checkResources();

    // 加载游戏数据
    try {
      await ConfigLoader.getInstance().loadIni('game/config/kys.ini');
    } catch {}
    try {
      const db = DBReader.getInstance();
      this.gameState = await db.createGameState('game_data.json');
      console.log('[KYS] 数据加载完成');
    } catch (e) {
      this.gameState = DemoResourceGenerator.generateDemoGameState();
    }
    await SaveManager.getInstance().init();
    if (this.gameState.GlobalData[0] <= 0) this.gameState.GlobalData[0] = 1000;

    // 标题画面
    while (true) {
      const title = new TitleScene();
      (title as any)._gameState = this.gameState;
      const result = await title.run(true);
      if (result < 0) break;

      if (result === 14) {
        const loaded = await SaveManager.getInstance().loadGame(0);
        if (loaded) this.gameState = loaded;
        continue;
      }

      if (result === 13) {
        const subScene = new SubScene();
        await subScene.init(this.gameState, 1);
        await subScene.run(true);
        continue;
      }

      if (result === 11) {
        const battle = new BattleScene(this.gameState, 0);
        await battle.run(true);
        continue;
      }

      if (result === 12) {
        await this.runSystemMenu();
        continue;
      }

      // 进入大地图/子场景循环。MainScene 用 -12 表示从大地图打开系统菜单，
      // 菜单关闭后应继续回到大地图，而不是退回标题。
      let keepMainLoop = true;
      while (keepMainLoop) {
        const mainScene = new MainScene();
        await mainScene.init(this.gameState);
        const next = await mainScene.run(true);
        if (next > 0) {
          const subScene = new SubScene();
          await subScene.init(this.gameState, next);
          await subScene.run(true);
        } else if (next === -12) {
          await this.runSystemMenu();
        } else {
          keepMainLoop = false;
        }
      }
    }

    engine.destroy();
  }

  private async runSystemMenu(): Promise<void> {
    let keepOpen = true;
    while (keepOpen) {
      const ui = new UISystem();
      const action = await ui.run(true);
      switch (action) {
        case 0: {
          const item = new UIItem();
          item.loadItems(this.gameState, this.gameState.SelfIndex);
          await item.run(true);
          break;
        }
        case 1:
        case 2: {
          const status = new UIStatus();
          status.loadState(this.gameState);
          await status.run(true);
          break;
        }
        case 3: {
          const team = new TeamMenu();
          team.loadState(this.gameState);
          await team.run(true);
          break;
        }
        case 4: {
          const save = new UISave('save');
          await save.loadSlots();
          const slot = await save.run(true);
          if (slot >= 0) await SaveManager.getInstance().saveGame(slot, this.gameState);
          break;
        }
        case 5: {
          const load = new UISave('load');
          await load.loadSlots();
          const slot = await load.run(true);
          if (slot >= 0) {
            const loaded = await SaveManager.getInstance().loadGame(slot);
            if (loaded) this.gameState = loaded;
          }
          break;
        }
        case 6: {
          const config = new UIConfig();
          await config.run(true);
          break;
        }
        case 7: {
          const keyConfig = new UIKeyConfig();
          await keyConfig.run(true);
          break;
        }
        case 9: {
          const shop = new UIShop();
          shop.loadShop(this.gameState, 0);
          await shop.run(true);
          break;
        }
        default:
          keepOpen = false;
          break;
      }
    }
  }
}

new Game().start().catch(err => {
  console.error('[KYS] Error:', err);
  document.body.innerHTML = `<div style="color:red;padding:20px"><h2>错误</h2><pre>${err}</pre></div>`;
});
