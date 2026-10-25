import manifest from '../data/audio_manifest.json';
import { assetUrl } from './assets';
import type { AudioChannel } from './settings';

// audio_manifest.json（音声20ファイルの正本）から作る対応表。ファイル名を推測で増やさない。


export interface SoundDef {
  key: string;
  path: string;
  channel: AudioChannel;
  role: string;
}

const CATEGORY: Record<string, AudioChannel> = { bgm: 'bgm', ambient: 'ambient', sfx: 'sfx' };

export const SOUNDS: Record<string, SoundDef> = Object.fromEntries(
  manifest.assets.map((a) => {
    const key = a.filename.replace(/\.mp3$/, '');
    return [key, { key, path: `audio/${a.relative_path}`, channel: CATEGORY[a.category], role: a.role }];
  }),
);

export function soundUrl(key: string): string {
  const def = SOUNDS[key];
  if (!def) throw new Error(`未登録の音声: ${key}`);
  return assetUrl(def.path);
}
