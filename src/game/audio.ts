import { MIX, OLD_HOUSE, dbToGain } from './audioMix';
import { SOUNDS, soundUrl } from './audioRegistry';
import { AUDIO_CHANNELS, type AudioChannel, type Settings } from './settings';

// 音声エンジン。
// - 音量は Web Audio の GainNode（iOS Safari は HTMLMediaElement.volume を変えられないため）。
//   系統（BGM・環境音・効果音）ごとの音量 × 素材ごとの補正（audioMix.ts）。
// - BGM・雨音は2つの再生器を交互に使い、末尾の手前で次の周回と重ねてつなぐ（無音の継ぎ目を出さない）。
// - 最初のユーザー操作で有効化（自動再生制限）。タブが隠れたら止める。
// - 音声は進行に必須ではない。失敗しても例外を外へ出さない。
// - テスト用に、再生の記録（log）を window.__study0017Audio から読めるようにしている。

type Ctor = typeof AudioContext;
type LogEntry = { t: number; ev: 'play' | 'stop' | 'loop' | 'skip'; key: string };

interface Voice {
  el: HTMLAudioElement;
  gain: GainNode;
}

class LoopTrack {
  private voices: Voice[] = [];
  private active = 0;
  private timer: number | undefined;
  private level = 1;
  playing = false;

  constructor(
    private engine: AudioEngine,
    readonly key: string,
  ) {}

  private voice(i: number): Voice | null {
    if (!this.voices[i]) {
      const v = this.engine.makeVoice(this.key);
      if (!v) return null;
      this.voices[i] = v;
    }
    return this.voices[i];
  }

  start(level: number, fadeIn: number) {
    this.level = level;
    if (this.playing) {
      this.engine.ramp(this.voices[this.active]?.gain, this.target(), 0.6);
      return;
    }
    const v = this.voice(this.active);
    if (!v) return;
    this.playing = true;
    v.el.currentTime = 0;
    void v.el.play().catch(() => undefined);
    v.gain.gain.value = 0;
    this.engine.ramp(v.gain, this.target(), fadeIn);
    this.engine.record('play', this.key);
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.check(), 150);
  }

  private target() {
    return this.level * dbToGain(MIX[this.key]?.gainDb ?? 0);
  }

  /** 末尾（ループ点 − クロスフェード）に来たら、もう一方を頭から鳴らして重ねる */
  private check() {
    if (!this.playing) return;
    const mix = MIX[this.key];
    const cur = this.voices[this.active];
    if (!cur || !mix?.loopEnd) return;
    const xf = mix.crossfade ?? 1;
    if (cur.el.currentTime < mix.loopEnd - xf) return;
    const nextIdx = 1 - this.active;
    const next = this.voice(nextIdx);
    if (!next) return;
    next.el.currentTime = 0;
    next.gain.gain.value = 0;
    void next.el.play().catch(() => undefined);
    this.engine.ramp(next.gain, this.target(), xf);
    this.engine.ramp(cur.gain, 0, xf);
    const old = cur;
    window.setTimeout(() => old.el.pause(), xf * 1000 + 100);
    this.active = nextIdx;
    this.engine.record('loop', this.key);
  }

  stop(fadeOut: number) {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    for (const v of this.voices) {
      if (!v) continue;
      this.engine.ramp(v.gain, 0, fadeOut);
      window.setTimeout(() => {
        if (!this.playing) v.el.pause();
      }, fadeOut * 1000 + 100);
    }
    this.engine.record('stop', this.key);
  }

  /** テスト用：今鳴っている再生器 */
  get activeElement() {
    return this.voices[this.active]?.el ?? null;
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private channelGain = new Map<AudioChannel, GainNode>();
  private sfx = new Map<string, Voice>();
  private loops = new Map<string, LoopTrack>();
  private oneShotBgm: Voice | null = null;
  private wantedBgm: string | null = null;
  private wantedAmbient: { key: string; level: number } | null = null;
  private settings: Settings | null = null;
  private lastSfxAt = new Map<string, number>();
  private lastAnySfx = -Infinity;
  private oldHouseOn = false;
  private oldHouseTimer: number | undefined;
  readonly log: LogEntry[] = [];

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

  record(ev: LogEntry['ev'], key: string) {
    this.log.push({ t: performance.now(), ev, key });
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }

  makeVoice(key: string): Voice | null {
    if (!this.ctx) return null;
    const def = SOUNDS[key];
    if (!def) return null;
    const el = new Audio(soundUrl(key));
    el.preload = 'auto';
    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(this.channelGain.get(def.channel)!);
    return { el, gain };
  }

  ramp(g: GainNode | undefined, to: number, seconds: number) {
    if (!g || !this.ctx) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + Math.max(0.01, seconds));
  }

  applySettings(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    for (const ch of AUDIO_CHANNELS) {
      const g = this.channelGain.get(ch);
      if (g) g.gain.setTargetAtTime(s.muted[ch] ? 0 : s.volume[ch], this.ctx.currentTime, 0.05);
    }
  }

  /** テスト用：系統の現在の音量（ミュートなら 0） */
  channelLevel(ch: AudioChannel): number | null {
    return this.channelGain.get(ch)?.gain.value ?? null;
  }

  /** BGM は常に1曲だけ。null で停止（fadeOut 秒で消す） */
  setBgm(key: string | null, fadeOut = 1.0): void {
    if (this.wantedBgm === key) return;
    this.wantedBgm = key;
    this.syncBgm(fadeOut);
  }

  /** 環境音（雨）。level は相対倍率 */
  setAmbient(key: string | null, level = 1): void {
    this.wantedAmbient = key ? { key, level } : null;
    this.syncAmbient();
  }

  playSfx(key: string, minIntervalMs = 120): void {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - (this.lastSfxAt.get(key) ?? -Infinity) < minIntervalMs) {
      this.record('skip', key);
      return;
    }
    this.lastSfxAt.set(key, now);
    if (key !== 'old_house') this.lastAnySfx = now;
    let v = this.sfx.get(key);
    if (!v) {
      const made = this.makeVoice(key);
      if (!made) return;
      v = made;
      this.sfx.set(key, v);
    }
    v.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    v.gain.gain.value = dbToGain(MIX[key]?.gainDb ?? 0);
    v.el.currentTime = 0;
    void v.el.play().catch(() => undefined);
    this.record('play', key);
  }

  stopSfx(key: string, fade = 0.3) {
    const v = this.sfx.get(key);
    if (!v) return;
    this.ramp(v.gain, 0, fade);
    window.setTimeout(() => v.el.pause(), fade * 1000 + 50);
  }

  /** 一瞬の静寂：BGMと環境音を絞り、ms 後に戻す */
  duck(ms: number): void {
    if (!this.ctx || !this.settings) return;
    const t = this.ctx.currentTime;
    for (const ch of ['bgm', 'ambient'] as const) {
      const g = this.channelGain.get(ch);
      if (!g) continue;
      const v = this.settings.muted[ch] ? 0 : this.settings.volume[ch];
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(v * 0.05, t + 0.4);
      g.gain.setValueAtTime(v * 0.05, t + ms / 1000);
      g.gain.linearRampToValueAtTime(v, t + ms / 1000 + 1.2);
    }
    this.record('play', 'duck');
  }

  /** 洋館のきしみ（old_house）を不規則な間隔で鳴らす。常時ループはしない */
  setOldHouse(on: boolean) {
    if (on === this.oldHouseOn) return;
    this.oldHouseOn = on;
    window.clearTimeout(this.oldHouseTimer);
    if (on) this.scheduleOldHouse(OLD_HOUSE.minGap, OLD_HOUSE.maxGap);
  }

  private scheduleOldHouse(min: number, max: number) {
    const sec = min + Math.random() * (max - min);
    this.oldHouseTimer = window.setTimeout(() => this.fireOldHouse(), sec * 1000);
  }

  private fireOldHouse() {
    if (!this.oldHouseOn) return;
    const quiet = (performance.now() - this.lastAnySfx) / 1000 >= OLD_HOUSE.quietAfterSfx;
    if (this.ctx && quiet && document.visibilityState === 'visible') {
      this.playSfx('old_house', OLD_HOUSE.minGap * 1000);
      this.scheduleOldHouse(OLD_HOUSE.minGap, OLD_HOUSE.maxGap);
    } else {
      // 重要な効果音の直後は見送り、少し後にもう一度試す
      this.record('skip', 'old_house');
      this.scheduleOldHouse(OLD_HOUSE.retryMin, OLD_HOUSE.retryMax);
    }
  }

  private loop(key: string) {
    let l = this.loops.get(key);
    if (!l) {
      l = new LoopTrack(this, key);
      this.loops.set(key, l);
    }
    return l;
  }

  private syncBgm(fadeOut: number) {
    if (!this.ctx) return;
    for (const [k, l] of this.loops) if (SOUNDS[k]?.channel === 'bgm' && k !== this.wantedBgm) l.stop(fadeOut);
    if (this.oneShotBgm && this.wantedBgm !== 'reveal') {
      const v = this.oneShotBgm;
      this.ramp(v.gain, 0, fadeOut);
      window.setTimeout(() => v.el.pause(), fadeOut * 1000 + 50);
      this.oneShotBgm = null;
      this.record('stop', 'reveal');
    }
    const key = this.wantedBgm;
    if (!key) return;
    if (MIX[key]?.loopEnd) this.loop(key).start(1, 1.2);
    else if (!this.oneShotBgm) {
      // reveal：ループしない演出曲
      const v = this.makeVoice(key);
      if (!v) return;
      this.oneShotBgm = v;
      v.el.currentTime = 0;
      void v.el.play().catch(() => undefined);
      this.ramp(v.gain, dbToGain(MIX[key]?.gainDb ?? 0), 1.0);
      this.record('play', key);
    }
  }

  private syncAmbient() {
    if (!this.ctx) return;
    for (const [k, l] of this.loops) if (SOUNDS[k]?.channel === 'ambient' && k !== this.wantedAmbient?.key) l.stop(0.8);
    if (this.wantedAmbient) this.loop(this.wantedAmbient.key).start(this.wantedAmbient.level, 1.0);
  }

  private sync() {
    this.syncBgm(1.0);
    this.syncAmbient();
  }

  /** テスト用：ループ中の再生器を末尾近くへ進める（ループのつなぎ目を確かめる） */
  seekLoopNearEnd(key: string, secondsBeforeEnd: number) {
    const l = this.loops.get(key);
    const end = MIX[key]?.loopEnd;
    const el = l?.activeElement;
    if (el && end) el.currentTime = end - secondsBeforeEnd;
  }

  isLoopPlaying(key: string) {
    return this.loops.get(key)?.playing ?? false;
  }

  private onVisibility() {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') void this.ctx.suspend();
    else void this.ctx.resume();
  }
}

export const audio = new AudioEngine();
(window as unknown as { __study0017Audio?: AudioEngine }).__study0017Audio = audio;
