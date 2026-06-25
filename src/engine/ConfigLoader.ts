import { AssetLoader } from './AssetLoader';

/** INI 配置解析器 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) ConfigLoader.instance = new ConfigLoader();
    return ConfigLoader.instance;
  }

  private config: Map<string, Map<string, string>> = new Map();
  private loaded = false;

  get isLoaded(): boolean { return this.loaded; }

  /** 加载 INI 文件 */
  async loadIni(filename: string): Promise<void> {
    const text = await AssetLoader.getInstance().loadText(filename);
    this.parseIni(text);
    this.loaded = true;
  }

  private parseIni(content: string): void {
    let currentSection = 'default';
    this.config.set(currentSection, new Map());

    for (let line of content.split('\n')) {
      line = line.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;

      // 节
      const sectionMatch = line.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        if (!this.config.has(currentSection)) {
          this.config.set(currentSection, new Map());
        }
        continue;
      }

      // 键值对
      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        this.config.get(currentSection)!.set(key, value);
      }
    }
  }

  /** 获取字符串值 */
  getString(section: string, key: string, defaultValue = ''): string {
    return this.config.get(section)?.get(key) ?? defaultValue;
  }

  /** 获取整数 */
  getInt(section: string, key: string, defaultValue = 0): number {
    const v = this.getString(section, key);
    return v ? parseInt(v, 10) : defaultValue;
  }

  /** 获取浮点数 */
  getFloat(section: string, key: string, defaultValue = 0): number {
    const v = this.getString(section, key);
    return v ? parseFloat(v) : defaultValue;
  }

  /** 获取布尔值 */
  getBool(section: string, key: string, defaultValue = false): boolean {
    const v = this.getString(section, key).toLowerCase();
    if (!v) return defaultValue;
    return v === '1' || v === 'true' || v === 'yes';
  }

  /** 获取整数列表（逗号分隔） */
  getIntList(section: string, key: string): number[] {
    const v = this.getString(section, key);
    if (!v) return [];
    return v.split(',').map(s => parseInt(s.trim(), 10));
  }

  /** 获取所有节名 */
  getSections(): string[] {
    return Array.from(this.config.keys());
  }

  /** 获取节中所有键 */
  getKeys(section: string): string[] {
    const sec = this.config.get(section);
    return sec ? Array.from(sec.keys()) : [];
  }
}
