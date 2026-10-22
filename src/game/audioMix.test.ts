import manifest from '../data/audio_manifest.json';
import { MIX, dbToGain } from './audioMix';

describe('音量補正とループ点', () => {
  it('20ファイルすべてに補正値がある', () => {
    for (const a of manifest.assets) expect(MIX[a.filename.replace('.mp3', '')], a.filename).toBeDefined();
    expect(Object.keys(MIX)).toHaveLength(20);
  });

  it('ループさせるのは BGM 2曲（title, study）と雨音だけ。ループ点は曲の長さより前で、末尾の無音を避ける', () => {
    const looped = Object.entries(MIX).filter(([, m]) => m.loopEnd).map(([k]) => k).sort();
    expect(looped).toEqual(['rain_loop', 'study', 'title']);
    for (const k of looped) {
      const dur = manifest.assets.find((a) => a.filename === `${k}.mp3`)!.duration_s;
      expect(MIX[k].loopEnd!).toBeLessThan(dur);
      expect(MIX[k].crossfade!).toBeGreaterThan(0);
    }
    expect(MIX.title.loopEnd!).toBeLessThan(178.89); // 計測した無音の開始
    expect(MIX.study.loopEnd!).toBeLessThan(206.115);
  });

  it('dB → 倍率', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(20)).toBeCloseTo(10);
  });
});
