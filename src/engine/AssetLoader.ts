import JSZip from 'jszip';

/** index.ka 中的偏移条目 */
export interface IndexEntry {
  x: number;
  y: number;
}

/** 战斗帧配置（fightframe.txt） */
export interface FightFrameConfig {
  /** 每方向帧数 [下, 左, 上, 右] */
  frameCounts: number[];
  /** 总帧数 */
  totalFrames: number;
}

/**
 * 资源加载器
 * 支持：PNG/WebP 图片、ZIP 压缩包、index.ka/index.txt 偏移、fightframe.txt 帧配置
 *
 * 资源目录结构（原版）：
 *   game/
 *   ├── resource/
 *   │   ├── head/          头像 (head_XXXX.png + index.ka)
 *   │   ├── fight/         战斗贴图 (fight_XXXX.png + fightframe.txt + index.ka)
 *   │   ├── scene/         场景贴图 (smap_XXXX.png + index.ka)
 *   │   ├── mmap/          大地图瓦片 (mmap_XXXX.png + index.ka)
 *   │   ├── item/          物品贴图
 *   │   └── ...            其他资源
 *   ├── game.db            SQLite 游戏数据库
 *   ├── config/
 *   │   ├── kys.ini        游戏配置
 *   │   └── battle.yaml    战斗配置
 *   ├── script/            Lua 剧情脚本
 *   └── list/
 *       ├── levelup.txt    升级经验表
 *       └── leave.txt      离队列表
 *
 * 加载优先级：ZIP > 目录文件
 */
export class AssetLoader {
  private static instance: AssetLoader;
  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) AssetLoader.instance = new AssetLoader();
    return AssetLoader.instance;
  }

  private basePath = 'game/';
  private cache: Map<string, any> = new Map();
  private zipCache: Map<string, JSZip> = new Map();
  private resourceAvailable = false;
  private demoMode = false;

  get isResourceAvailable(): boolean { return this.resourceAvailable; }
  get isDemoMode(): boolean { return this.demoMode; }

  setBasePath(path: string): void { this.basePath = path; }

  /** 检测资源是否可用 */
  async checkResources(): Promise<boolean> {
    try {
      const resp = await fetch(this.basePath + 'game.db', { method: 'HEAD' });
      if (resp.ok) {
        this.resourceAvailable = true;
        console.log('[AssetLoader] Game resources detected');
        return true;
      }
    } catch {}
    console.log('[AssetLoader] No game resources found, running in demo mode');
    this.demoMode = true;
    return false;
  }

  /** 加载图片（支持 ZIP 优先 + 目录回退） */
  async loadImage(dirPath: string, filename: string): Promise<HTMLImageElement> {
    const cacheKey = `${dirPath}/${filename}`;
    const cached = this.cache.get(cacheKey);
    if (cached instanceof HTMLImageElement) return cached;

    // 1. 尝试 ZIP 加载（zip 文件名 = 目录名.zip）
    const zipName = dirPath.replace(/\/$/, '') + '.zip';
    try {
      const zip = await this.loadZip(zipName);
      const img = await this.loadImageFromZip(zip, filename);
      this.cache.set(cacheKey, img);
      return img;
    } catch {}

    // 2. 尝试直接目录文件
    const fullPath = this.basePath + dirPath + '/' + filename;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load: ${fullPath}`));
      img.src = fullPath;
    });
  }

  /** 按编号加载图片（如 resource/head/0.png） */
  async loadImageById(dirPath: string, id: number): Promise<HTMLImageElement> {
    return this.loadImage(dirPath, `${id}.png`);
  }

  /** 加载 ZIP 文件 */
  async loadZip(name: string): Promise<JSZip> {
    const fullPath = this.basePath + name;
    const cached = this.zipCache.get(fullPath);
    if (cached) return cached;

    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`ZIP not found: ${fullPath}`);
    const blob = await resp.blob();
    const zip = await JSZip.loadAsync(blob);
    this.zipCache.set(fullPath, zip);
    return zip;
  }

  /** 从 ZIP 中加载图片 */
  async loadImageFromZip(zip: JSZip, entryName: string): Promise<HTMLImageElement> {
    // 尝试多种可能的文件名
    let file = zip.file(entryName);
    if (!file) file = zip.file(entryName.replace('.png', '.webp'));
    if (!file) file = zip.file(entryName + '.png');
    if (!file) throw new Error(`Not found in zip: ${entryName}`);

    const blob = await file.async('blob');
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Zip image: ${entryName}`)); };
      img.src = url;
    });
  }

  // ============================================================
  // 偏移文件加载（index.ka / index.txt）
  // ============================================================

  /** 加载 index.txt（文本格式偏移文件） */
  async loadIndexTxt(path: string): Promise<Map<number, IndexEntry>> {
    const fullPath = this.basePath + path;
    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`Not found: ${fullPath}`);
    const text = await resp.text();
    return this.parseIndexTxt(text);
  }

  private parseIndexTxt(text: string): Map<number, IndexEntry> {
    const map = new Map<number, IndexEntry>();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
      const match = trimmed.match(/^(-?\d+)\s*:\s*(-?\d+)\s*,\s*(-?\d+)/);
      if (match) {
        map.set(parseInt(match[1]), { x: parseInt(match[2]), y: parseInt(match[3]) });
      }
    }
    return map;
  }

  /** 加载 index.ka（二进制格式：连续 int16 对，小端序） */
  async loadIndexKa(path: string): Promise<Map<number, IndexEntry>> {
    const fullPath = this.basePath + path;
    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`Not found: ${fullPath}`);
    const buffer = await resp.arrayBuffer();
    return this.parseIndexKa(buffer);
  }

  private parseIndexKa(buffer: ArrayBuffer): Map<number, IndexEntry> {
    const view = new DataView(buffer);
    const map = new Map<number, IndexEntry>();
    for (let i = 0; i + 3 < view.byteLength; i += 4) {
      const idx = i / 4;
      const x = view.getInt16(i, true);
      const y = view.getInt16(i + 2, true);
      if (x !== 0 || y !== 0) map.set(idx, { x, y });
    }
    return map;
  }

  private async loadIndexTxtFromZip(dirPath: string): Promise<Map<number, IndexEntry>> {
    const zip = await this.loadZip(dirPath.replace(/\/$/, '') + '.zip');
    const file = zip.file('index.txt');
    if (!file) throw new Error(`index.txt not found in ${dirPath}.zip`);
    return this.parseIndexTxt(await file.async('text'));
  }

  private async loadIndexKaFromZip(dirPath: string): Promise<Map<number, IndexEntry>> {
    const zip = await this.loadZip(dirPath.replace(/\/$/, '') + '.zip');
    const file = zip.file('index.ka');
    if (!file) throw new Error(`index.ka not found in ${dirPath}.zip`);
    return this.parseIndexKa(await file.async('arraybuffer'));
  }

  /** 自动加载偏移文件：先 index.txt，后 index.ka；支持目录文件和 ZIP 内 index */
  async loadIndex(dirPath: string): Promise<Map<number, IndexEntry>> {
    const base = dirPath.replace(/\/$/, '') + '/';
    try { return await this.loadIndexTxt(base + 'index.txt'); } catch {}
    try { return await this.loadIndexKa(base + 'index.ka'); } catch {}
    try { return await this.loadIndexTxtFromZip(dirPath); } catch {}
    try { return await this.loadIndexKaFromZip(dirPath); } catch {}
    return new Map();
  }

  // ============================================================
  // 战斗帧配置（fightframe.txt）
  // ============================================================

  /**
   * 加载 fightframe.txt
   * 格式：每行 "动作索引(0~4) 下帧数 左帧数 上帧数 右帧数"
   * 例：0 4 4 4 4
   */
  async loadFightFrame(path: string): Promise<FightFrameConfig> {
    try {
      const text = await this.loadText(path);
      const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      // 默认每方向帧数
      const frameCounts: number[] = [0, 0, 0, 0]; // [下, 左, 上, 右]

      for (const line of lines) {
        const parts = line.trim().split(/\s+/).map(Number);
        if (parts.length >= 5) {
          const actionIdx = parts[0];
          if (actionIdx >= 0 && actionIdx < 4) {
            for (let dir = 0; dir < 4; dir++) {
              frameCounts[dir] += parts[dir + 1] || 0;
            }
          }
        } else if (parts.length >= 4) {
          // 简化格式：直接 4 个方向的帧数
          for (let dir = 0; dir < 4; dir++) {
            frameCounts[dir] = Math.max(frameCounts[dir], parts[dir] || 0);
          }
          break; // 只读第一行
        }
      }

      const totalFrames = frameCounts.reduce((a, b) => a + b, 0);
      return { frameCounts, totalFrames };
    } catch {
      return { frameCounts: [0, 0, 0, 0], totalFrames: 0 };
    }
  }

  /** 加载完整战斗纹理组（图片 + 偏移 + 帧配置） */
  async loadBattleTextureGroup(dirPath: string): Promise<{
    images: HTMLImageElement[];
    offsets: Map<number, IndexEntry>;
    frameConfig: FightFrameConfig;
  }> {
    const offsets = await this.loadIndex(dirPath);
    const frameConfig = await this.loadFightFrame(dirPath + '/fightframe.txt');

    const images: HTMLImageElement[] = [];
    for (let i = 0; i < frameConfig.totalFrames; i++) {
      try {
        const img = await this.loadImageById(dirPath, i);
        images.push(img);
      } catch {
        images.push(null as any);
      }
    }

    return { images, offsets, frameConfig };
  }

  // ============================================================
  // 二进制/文本文件加载
  // ============================================================

  async loadBinary(path: string): Promise<ArrayBuffer> {
    const fullPath = this.basePath + path;
    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`Not found: ${fullPath}`);
    return resp.arrayBuffer();
  }

  async loadText(path: string): Promise<string> {
    const fullPath = this.basePath + path;
    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`Not found: ${fullPath}`);
    return resp.text();
  }

  async loadJson<T = any>(path: string): Promise<T> {
    const fullPath = this.basePath + path;
    const resp = await fetch(fullPath);
    if (!resp.ok) throw new Error(`Not found: ${fullPath}`);
    return resp.json();
  }

  /** 清除所有缓存 */
  clearCache(): void {
    this.cache.clear();
    this.zipCache.clear();
    this.resourceAvailable = false;
    this.demoMode = false;
  }
}
