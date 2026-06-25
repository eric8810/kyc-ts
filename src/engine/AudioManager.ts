import { Howl, Howler } from 'howler';

export class AudioManager {
  private static instance: AudioManager;
  static getInstance(): AudioManager {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  private musicHowl: Howl | null = null;
  private soundHowls: Map<string, Howl> = new Map();
  private musicVolume = 0.2;
  private soundVolume = 0.5;
  private soundPool: Howl[] = [];
  private soundPoolSize = 20;
  private currentPoolIndex = 0;
  private basePath = 'game/';

  private constructor() {}

  init(): void {
    Howler.autoUnlock = true;
  }

  setBasePath(path: string): void {
    this.basePath = path;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicHowl) this.musicHowl.volume(this.musicVolume);
  }

  setSoundVolume(v: number): void {
    this.soundVolume = Math.max(0, Math.min(1, v));
  }

  getMusicVolume(): number { return this.musicVolume; }
  getSoundVolume(): number { return this.soundVolume; }

  /** 播放音乐（循环） */
  playMusic(filename: string): void {
    if (this.musicHowl) {
      this.musicHowl.stop();
      this.musicHowl.unload();
    }
    const src = this.basePath + filename;
    this.musicHowl = new Howl({
      src: [src],
      loop: true,
      volume: this.musicVolume,
      html5: true, // 流式播放适合长音频
    });
    this.musicHowl.play();
  }

  /** 停止音乐 */
  stopMusic(): void {
    if (this.musicHowl) {
      this.musicHowl.stop();
      this.musicHowl.unload();
      this.musicHowl = null;
    }
  }

  /** 暂停/恢复音乐 */
  pauseMusic(pause: boolean): void {
    if (!this.musicHowl) return;
    if (pause) this.musicHowl.pause();
    else this.musicHowl.play();
  }

  /** 播放音效（使用音效池轮转复用） */
  playSound(filename: string): void {
    const src = this.basePath + filename;
    const howl = new Howl({
      src: [src],
      volume: this.soundVolume,
    });
    this.soundPool[this.currentPoolIndex] = howl;
    this.currentPoolIndex = (this.currentPoolIndex + 1) % this.soundPoolSize;
    howl.play();
    howl.on('end', () => howl.unload());
  }

  /** 针对 MIDI 文件的特殊处理（使用 SoundFont 渲染） */
  async playMidi(filename: string): Promise<void> {
    // MIDI 渲染需要 SoundFont，使用 webaudiofont 或 sf2synth 等库
    // 暂将 MIDI 也作为普通音频尝试播放（部分浏览器不支持）
    console.warn(`MIDI playback not fully implemented: ${filename}`);
  }

  destroy(): void {
    this.stopMusic();
    this.soundPool.forEach(h => h.unload());
    this.soundPool = [];
  }
}
