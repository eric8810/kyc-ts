import { Engine } from './engine/Engine';
import { AssetLoader } from './engine/AssetLoader';
import { ConfigLoader } from './engine/ConfigLoader';
import { AudioManager } from './engine/AudioManager';
import { SaveManager } from './data/SaveManager';
import { DBReader } from './data/DBReader';
import { DemoResourceGenerator } from './data/DemoResources';
import { TitleScene } from './scenes/TitleScene';
import { MainScene } from './scenes/MainScene';
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

    // 标题画面
    while (true) {
      const title = new TitleScene();
      (title as any)._gameState = this.gameState;
      const result = await title.run(true);
      if (result < 0) break;

      // 进入大地图
      const mainScene = new MainScene();
      await mainScene.init(this.gameState);
      await mainScene.run(true);
    }

    engine.destroy();
  }
}

new Game().start().catch(err => {
  console.error('[KYS] Error:', err);
  document.body.innerHTML = `<div style="color:red;padding:20px"><h2>错误</h2><pre>${err}</pre></div>`;
});
