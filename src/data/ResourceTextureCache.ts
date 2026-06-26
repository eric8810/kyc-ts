import { Sprite, Texture } from 'pixi.js';
import { AssetLoader, type IndexEntry } from '../engine/AssetLoader';

export interface CachedTexture {
  texture: Texture;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * 轻量级按需纹理缓存。
 *
 * 原版资源 mmap/smap 很大，不能在启动时一次性全部 loadGroup；这里按画面实际用到的 id
 * 懒加载，并在下一帧替换掉几何 fallback。坐标偏移沿用 kys-cpp 的 index.ka 逻辑：
 * renderTexture(tex, x, y) 实际绘制在 (x - dx, y - dy)。
 */
export class ResourceTextureCache {
  private static instance: ResourceTextureCache;
  static getInstance(): ResourceTextureCache {
    if (!ResourceTextureCache.instance) ResourceTextureCache.instance = new ResourceTextureCache();
    return ResourceTextureCache.instance;
  }

  private loader = AssetLoader.getInstance();
  private cache = new Map<string, CachedTexture | null>();
  private pending = new Map<string, Promise<CachedTexture | null>>();
  private indexes = new Map<string, Map<number, IndexEntry>>();
  private indexPending = new Map<string, Promise<Map<number, IndexEntry>>>();

  private key(dirPath: string, id: number): string {
    return `${dirPath}/${id}`;
  }

  getCached(dirPath: string, id: number): CachedTexture | null | undefined {
    return this.cache.get(this.key(dirPath, id));
  }

  request(dirPath: string, id: number): void {
    const key = this.key(dirPath, id);
    if (this.cache.has(key) || this.pending.has(key)) return;
    this.pending.set(key, this.load(dirPath, id).finally(() => this.pending.delete(key)));
  }

  async preload(dirPath: string, ids: Iterable<number>): Promise<void> {
    await Promise.all(Array.from(new Set(Array.from(ids).filter(id => id >= 0))).map(id => this.load(dirPath, id)));
  }

  async load(dirPath: string, id: number): Promise<CachedTexture | null> {
    const key = this.key(dirPath, id);
    if (this.cache.has(key)) return this.cache.get(key) ?? null;
    const pending = this.pending.get(key);
    if (pending) return pending;

    const promise = this.loadInner(dirPath, id).finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  createSprite(dirPath: string, id: number, x: number, y: number, scale = 1): Sprite | null {
    const cached = this.getCached(dirPath, id);
    if (cached === undefined) this.request(dirPath, id);
    if (!cached) return null;

    const sprite = new Sprite(cached.texture);
    sprite.x = Math.round(x - cached.offsetX * scale);
    sprite.y = Math.round(y - cached.offsetY * scale);
    sprite.scale.set(scale);
    return sprite;
  }

  private async loadIndex(dirPath: string): Promise<Map<number, IndexEntry>> {
    const cached = this.indexes.get(dirPath);
    if (cached) return cached;
    const pending = this.indexPending.get(dirPath);
    if (pending) return pending;

    const promise = this.loader.loadIndex(dirPath).then(index => {
      this.indexes.set(dirPath, index);
      return index;
    }).finally(() => this.indexPending.delete(dirPath));
    this.indexPending.set(dirPath, promise);
    return promise;
  }

  private async loadInner(dirPath: string, id: number): Promise<CachedTexture | null> {
    const key = this.key(dirPath, id);
    try {
      const [img, index] = await Promise.all([
        this.loader.loadImage(dirPath, `${id}.png`),
        this.loadIndex(dirPath),
      ]);
      const bmp = await createImageBitmap(img);
      const offset = index.get(id) ?? { x: 0, y: 0 };
      const result: CachedTexture = {
        texture: Texture.from(bmp),
        offsetX: offset.x,
        offsetY: offset.y,
        width: img.width,
        height: img.height,
      };
      this.cache.set(key, result);
      return result;
    } catch {
      this.cache.set(key, null);
      return null;
    }
  }
}
