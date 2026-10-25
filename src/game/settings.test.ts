import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

describe('設定の保存', () => {
  beforeEach(() => localStorage.clear());

  it('保存した設定を読み戻せる', () => {
    const s = { ...DEFAULT_SETTINGS, volume: { bgm: 0.2, ambient: 0.3, sfx: 0.4 }, reducedMotion: 'on' as const };
    expect(saveSettings(s)).toBe(true);
    expect(loadSettings()).toEqual(s);
  });

  it('壊れたデータや範囲外の値は既定値に戻す', () => {
    localStorage.setItem('study0017.settings.v1', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('study0017.settings.v1', JSON.stringify({ volume: { bgm: 5 }, reducedMotion: 'x' }));
    const s = loadSettings();
    expect(s.volume.bgm).toBe(DEFAULT_SETTINGS.volume.bgm);
    expect(s.reducedMotion).toBe('system');
  });
});
