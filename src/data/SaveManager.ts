import type { GameState, RoleSave } from './Types';

/**
 * SaveManager — 存档管理器
 * 使用 IndexedDB 持久化存档数据
 */
export class SaveManager {
  private static instance: SaveManager;
  static getInstance(): SaveManager {
    if (!SaveManager.instance) SaveManager.instance = new SaveManager();
    return SaveManager.instance;
  }

  private db: IDBDatabase | null = null;
  private dbName = 'kys-saves';
  private dbVersion = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** 保存游戏状态 */
  async saveGame(slot: number, state: GameState): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');
      const data = {
        id: slot,
        timestamp: Date.now(),
        state: JSON.stringify(state),
      };
      store.put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** 加载游戏状态 */
  async loadGame(slot: number): Promise<GameState | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');
      const request = store.get(slot);
      request.onsuccess = () => {
        if (request.result) {
          const state = JSON.parse(request.result.state) as GameState;
          // 恢复 TypedArray
          if (state.GlobalData) {
            state.GlobalData = Int32Array.from(Object.values(state.GlobalData));
          }
          resolve(state);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** 删除存档 */
  async deleteSave(slot: number): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');
      store.delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** 获取存档列表 */
  async listSaves(): Promise<{ slot: number; timestamp: number }[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result.map((r: any) => ({
          slot: r.id,
          timestamp: r.timestamp,
        })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** 保存配置 */
  async saveConfig(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      store.put({ key, value: JSON.stringify(value) });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** 读取配置 */
  async loadConfig<T = any>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          resolve(JSON.parse(request.result.value));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}
