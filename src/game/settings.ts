export type AudioChannel = 'bgm' | 'ambient' | 'sfx';
export const AUDIO_CHANNELS: AudioChannel[] = ['bgm', 'ambient', 'sfx'];
export const AUDIO_CHANNEL_LABEL: Record<AudioChannel, string> = { bgm: 'BGM', ambient: '環境音', sfx: '効果音' };

export interface Settings {
  volume: Record<AudioChannel, number>;
  muted: Record<AudioChannel, boolean>;
  /** system = 端末の「視差効果を減らす」に従う */
  reducedMotion: 'system' | 'on' | 'off';
}

export const DEFAULT_SETTINGS: Settings = {
  volume: { bgm: 0.6, ambient: 0.7, sfx: 0.8 },
  muted: { bgm: false, ambient: false, sfx: false },
  reducedMotion: 'system',
};

// 設定だけは第1段階から端末に保存する。ゲーム進行のセーブは第3段階で別キーとして実装する。
const KEY = 'study0017.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<Settings>;
    const clamp = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
    return {
      volume: {
        bgm: clamp(s.volume?.bgm, DEFAULT_SETTINGS.volume.bgm),
        ambient: clamp(s.volume?.ambient, DEFAULT_SETTINGS.volume.ambient),
        sfx: clamp(s.volume?.sfx, DEFAULT_SETTINGS.volume.sfx),
      },
      muted: {
        bgm: s.muted?.bgm === true,
        ambient: s.muted?.ambient === true,
        sfx: s.muted?.sfx === true,
      },
      reducedMotion: s.reducedMotion === 'on' || s.reducedMotion === 'off' ? s.reducedMotion : 'system',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 保存できたら true。プライベートモード等で失敗しても例外は出さない */
export function saveSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
