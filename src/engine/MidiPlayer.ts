/**
 * MIDI Player — 使用 Web Audio API + SoundFont 渲染 MIDI
 * 依赖 webaudiofont (npm: webaudiofont) 或内嵌迷你 SoundFont
 */
export class MidiPlayer {
  private static instance: MidiPlayer;
  static getInstance(): MidiPlayer {
    if (!MidiPlayer.instance) MidiPlayer.instance = new MidiPlayer();
    return MidiPlayer.instance;
  }

  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private volume = 0.2;
  private playing = false;

  /** 初始化 AudioContext */
  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.value = this.volume;
  }

  /**
   * 播放 MIDI 文件（使用内嵌简化 SoundFont）
   * 
   * 完整 MIDI 播放需要：
   * 1. MIDI 解析器（如 midi-file 或 jsmidgen）
   * 2. SoundFont 渲染器（如 webaudiofont、sf2synth）
   * 
   * 当前实现：使用简易方波合成器作为占位
   * 完整实现时替换为 SoundFont 引擎
   */
  async playMidi(url: string): Promise<void> {
    const ctx = this.ensureContext();
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`MIDI not found: ${url}`);
      const arrayBuffer = await resp.arrayBuffer();

      // TODO: 集成完整 MIDI 解析 + SoundFont 渲染
      // 当前：播放 440Hz 提示音表示 MIDI 功能就绪
      this.playTone(ctx, 440, 0.5);
      console.log('[MidiPlayer] MIDI loaded, SoundFont rendering pending');
    } catch (e) {
      console.warn('[MidiPlayer] Failed to load MIDI:', e);
    }
  }

  /** 播放提示音 */
  private playTone(ctx: AudioContext, freq: number, duration: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  stop(): void {
    this.playing = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
    }
  }
}
