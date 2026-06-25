import { Texture, Rectangle } from 'pixi.js';
import { AssetLoader, IndexEntry } from '../engine/AssetLoader';
import { Engine } from '../engine/Engine';

/**
 * 纹理包装 — 单个精灵贴图 + 偏移
 */
export interface TextureWrapper {
  texture: Texture;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * 纹理组 — 一组相关贴图（如一个角色的所有帧）
 */
export class TextureGroup {
  textures: TextureWrapper[] = [];
  count = 0;

  getTexture(index: number): TextureWrapper | null {
    if (index < 0 || index >= this.count) return null;
    return this.textures[index];
  }
}

/**
 * TextureManager — 纹理管理器
 * 管理游戏所有纹理的加载、缓存和偏移信息
 */
export class TextureManager {
  private static instance: TextureManager;
  static getInstance(): TextureManager {
    if (!TextureManager.instance) TextureManager.instance = new TextureManager();
    return TextureManager.instance;
  }

  private groups: Map<string, TextureGroup> = new Map();
  private loader = AssetLoader.getInstance();

  /**
   * 从目录加载纹理组（带索引偏移）
   * @param name 纹理组名称
   * @param path 资源路径（目录或 ZIP 前缀）
   * @param count 纹理数量
   * @param indexMap 偏移映射表
   */
  async loadGroup(name: string, path: string, count: number, indexMap?: Map<number, IndexEntry>): Promise<TextureGroup> {
    const group = new TextureGroup();
    const engine = Engine.getInstance();

    for (let i = 0; i < count; i++) {
      const offset = indexMap?.get(i) ?? { x: 0, y: 0 };
      try {
        const img = await this.loader.loadImage(path, `${i}.png`);
        const bmp = await createImageBitmap(img);
        const texture = Texture.from(bmp);
        group.textures.push({
          texture,
          offsetX: offset.x,
          offsetY: offset.y,
          width: img.width,
          height: img.height,
        });
      } catch {
        // 跳过缺失的贴图
        group.textures.push({
          texture: Texture.EMPTY,
          offsetX: offset.x,
          offsetY: offset.y,
          width: 0,
          height: 0,
        });
      }
    }

    group.count = group.textures.length;
    this.groups.set(name, group);
    return group;
  }

  /**
   * 加载战斗动画纹理组（按方向分帧）
   * @param name 名称
   * @param path 路径
   * @param frameCounts 每方向帧数 [下, 左, 上, 右]
   * @param indexMap 偏移表
   */
  async loadBattleGroup(name: string, path: string, frameCounts: number[], indexMap?: Map<number, IndexEntry>): Promise<TextureGroup> {
    const group = new TextureGroup();
    let idx = 0;
    for (let dir = 0; dir < 4; dir++) {
      const count = frameCounts[dir] || 0;
      for (let f = 0; f < count; f++) {
        const offset = indexMap?.get(idx) ?? { x: 0, y: 0 };
        try {
          const img = await this.loader.loadImage(path, `${idx}.png`);
          const bmp = await createImageBitmap(img);
          const texture = Texture.from(bmp);
          group.textures.push({
            texture,
            offsetX: offset.x,
            offsetY: offset.y,
            width: img.width,
            height: img.height,
          });
        } catch {
          group.textures.push({
            texture: Texture.EMPTY,
            offsetX: offset.x,
            offsetY: offset.y,
            width: 0,
            height: 0,
          });
        }
        idx++;
      }
    }
    group.count = group.textures.length;
    this.groups.set(name, group);
    return group;
  }

  /** 获取纹理组 */
  getGroup(name: string): TextureGroup | undefined {
    return this.groups.get(name);
  }

  /** 获取纹理组的指定贴图 */
  getTexture(groupName: string, index: number): TextureWrapper | null {
    const group = this.groups.get(groupName);
    return group?.getTexture(index) ?? null;
  }

  /** 清除所有缓存 */
  clear(): void {
    this.groups.clear();
  }

  /** 获取已加载的纹理组名称列表 */
  getGroupNames(): string[] {
    return Array.from(this.groups.keys());
  }
}
