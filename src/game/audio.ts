import { SOUNDS, soundUrl } from './audioRegistry';
import { AUDIO_CHANNELS, type AudioChannel, type Settings } from './settings';

// Web Audio の GainNode で音量を管理する（iOS Safari は HTMLMediaElement.volume を変更できないため）。
// 音声はゲーム進行に必須ではない。失敗しても例外を外へ出さない。
// ループの継ぎ目・無音区間・環境音の音量バランスは第4段階で調整する。

type Ctor = typeof AudioContext;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private channelGain = new Map<AudioChannel, GainNode>();
  private elements = new Map<string, { el: HTMLAudioElement; gain: GainNode }>();
  private currentBgm: string | null = null;
  private wantedBgm: string | null = null;
  private wantedAmbient: { key: string; level: number } | null = null;
  private settings: Settings | null = null;
  private lastSfxAt = new Map<string, number>();

  /** ユーザー操作の中で呼ぶ（自動再生制限への対応） */
  unlock(): void {
    try {
      if (!this.ctx) {
        const C: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
        if (!C) return;
        this.ctx = new C();
        for (const ch of AUDIO_CHANNELS) {
          const g = this.ctx.createGain();
          g.connect(this.ctx.destination);
          this.channelGain.set(ch, g);
        }
        if (this.settings) this.applySettings(this.settings);
        document.addEventListener('visibilitychange', () => this.onVisibility());
      }
      if (this.ctx.state === 'suspended' && document.visibilityState === 'visible') void this.ctx.resume();
      this.sync();
    } catch {
      this.ctx = null;
    }
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  applySettings(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    for (const ch of AUDIO_CHANNELS) {
      const g = this.channelGain.get(ch);
      if (g) g.gain.setTargetAtTime(s.muted[ch] ? 0 : s.volume[ch], this.ctx.currentTime, 0.05);
    }
  }

  /** BGM は常に1曲だけ。null で停止 */
  setBgm(key: string | null): void {
    this.wantedBgm = key;
    this.sync();
  }

  /** 環境音（雨）。level は相対倍率 */
  setAmbient(key: string | null, level = 1): void {
    this.wantedAmbient = key ? { key, level } : null;
    this.sync();
  }

  playSfx(key: string, minIntervalMs = 120): void {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - (this.lastSfxAt.get(key) ?? -Infinity) < minIntervalMs) return;
    this.lastSfxAt.set(key, now);
    const node = this.node(key);
    if (!node) return;
    node.gain.gain.value = 1;
    node.el.currentTime = 0;
    void node.el.play().catch(() => undefined);
  }

  private node(key: string) {
    if (!this.ctx) return null;
    let n = this.elements.get(key);
    if (!n) {
      const def = SOUNDS[key];
      if (!def) return null;
      const el = new Audio(soundUrl(key));
      el.preload = 'auto';
      const src = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.channelGain.get(def.channel)!);
      n = { el, gain };
      this.elements.set(key, n);
    }
    return n;
  }

  private fade(key: string, to: number, seconds: number, thenPause = false) {
    const n = this.elements.get(key);
    if (!n || !this.ctx) return;
    const t = this.ctx.currentTime;
    n.gain.gain.cancelScheduledValues(t);
    n.gain.gain.setValueAtTime(n.gain.gain.value, t);
    n.gain.gain.linearRampToValueAtTime(to, t + seconds);
    if (thenPause) window.setTimeout(() => {
      if (this.currentBgm !== key && this.wantedAmbient?.key !== key) n.el.pause();
    }, seconds * 1000 + 50);
  }

  private sync() {
    if (!this.ctx) return;
    // BGM（排他）
    if (this.currentBgm !== this.wantedBgm) {
      if (this.currentBgm) this.fade(this.currentBgm, 0, 1.0, true);
      this.currentBgm = this.wantedBgm;
      if (this.wantedBgm) {
        const n = this.node(this.wantedBgm);
        if (n) {
          n.el.loop = true;
          void n.el.play().catch(() => undefined);
          this.fade(this.wantedBgm, 1, 1.2);
        }
      }
    }
    // 環境音
    for (const [key, n] of this.elements) {
      if (SOUNDS[key]?.channel !== 'ambient') continue;
      if (this.wantedAmbient?.key !== key) this.fade(key, 0, 0.8, true);
      else n.el.paused || this.fade(key, this.wantedAmbient.level, 0.6);
    }
    if (this.wantedAmbient) {
      const n = this.node(this.wantedAmbient.key);
      if (n && n.el.paused) {
        n.el.loop = true;
        void n.el.play().catch(() => undefined);
        this.fade(this.wantedAmbient.key, this.wantedAmbient.level, 1.0);
      }
    }
  }

  private onVisibility() {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') void this.ctx.suspend();
    else void this.ctx.resume();
  }
}

export const audio = new AudioEngine();
