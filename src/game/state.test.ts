import { DEFAULT_SETTINGS } from './settings';
import { initialState, reducer, type GameState } from './state';

const explore = (): GameState => reducer(reducer(initialState(), { type: 'newGame' }), { type: 'enterStudy' });

describe('画面遷移', () => {
  it('タイトル→導入→書斎（北から開始）', () => {
    const s0 = initialState();
    expect(s0.screen).toBe('title');
    const s1 = reducer(s0, { type: 'newGame' });
    expect(s1.screen).toBe('opening');
    const s2 = reducer(s1, { type: 'enterStudy' });
    expect(s2.screen).toBe('explore');
    expect(s2.facing).toBe('north');
  });

  it('右回り：北→東→南→西→北、左回りは逆', () => {
    let s = explore();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      s = reducer(s, { type: 'turn', dir: 1 });
      seen.push(s.facing);
    }
    expect(seen).toEqual(['east', 'south', 'west', 'north']);
    s = reducer(s, { type: 'turn', dir: -1 });
    expect(s.facing).toBe('west');
  });

  it('拡大画面や重ねた画面を開いている間は向きを変えない', () => {
    let s = reducer(explore(), { type: 'openCloseup', id: 'bookshelf' });
    expect(reducer(s, { type: 'turn', dir: 1 }).facing).toBe('north');
    s = reducer(reducer(s, { type: 'closeCloseup' }), { type: 'openOverlay', id: 'settings' });
    expect(reducer(s, { type: 'turn', dir: 1 }).facing).toBe('north');
  });

  it('重ねる画面は1つだけで、閉じると拡大画面に戻る', () => {
    let s = reducer(explore(), { type: 'openCloseup', id: 'clock' });
    s = reducer(s, { type: 'openOverlay', id: 'hints' });
    s = reducer(s, { type: 'openOverlay', id: 'settings' });
    expect(s.overlay).toBe('settings');
    s = reducer(s, { type: 'closeOverlay' });
    expect(s.overlay).toBeNull();
    expect(s.closeup).toBe('clock');
  });

  it('ヒントは1段階ずつ、最大3段階（進行データに含む）', () => {
    let s = explore();
    for (let i = 0; i < 5; i++) s = reducer(s, { type: 'revealHint', puzzle: 'clock' });
    expect(s.progress.hintLevels.clock).toBe(3);
    expect(s.progress.hintLevels.books).toBe(0);
  });

  it('はじめからは進行を初期化し、設定は保つ', () => {
    let s = reducer(explore(), { type: 'revealHint', puzzle: 'door' });
    const muted = { ...DEFAULT_SETTINGS, muted: { bgm: true, ambient: false, sfx: false } };
    s = reducer(s, { type: 'setSettings', settings: muted });
    s = reducer(s, { type: 'newGame' });
    expect(s.progress.hintLevels.door).toBe(0);
    expect(s.settings.muted.bgm).toBe(true);
  });
});
