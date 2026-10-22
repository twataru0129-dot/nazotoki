import { SAVE_KEY, CORRUPT_KEY, discardSave, loadSave, validateSave, writeSave } from './save';
import { initialProgress, initialState, reducer } from './state';

describe('オートセーブ（最小限）', () => {
  beforeEach(() => localStorage.clear());

  it('保存→読み込みで進行が一致する', () => {
    let s = reducer(reducer(initialState(), { type: 'newGame' }), { type: 'enterStudy' });
    s = reducer(s, { type: 'swapBooks', i: 0, j: 3 });
    s = reducer(s, { type: 'adjustClock', delta: -3 });
    expect(writeSave({ facing: 'east', closeup: 'clock', progress: s.progress })).toBe(true);
    const r = loadSave();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.data.progress).toEqual(s.progress);
      expect(r.data.facing).toBe('east');
      expect(r.data.closeup).toBe('clock');
    }
  });

  it('壊れたデータ・矛盾したデータは読み込まない', () => {
    localStorage.setItem(SAVE_KEY, '{oops');
    expect(loadSave().status).toBe('corrupt');
    const p = initialProgress();
    // カードが2か所（同じ枠を2枚が使う）
    const dup = { ...p, cards: { ...p.cards, A: { at: 'slot', index: 0 }, B: { at: 'slot', index: 0 } } };
    expect(validateSave({ saveVersion: 1, chapter: 1, savedAt: '', facing: 'north', closeup: null, progress: dup })).toBeNull();
    // 収納が開いていないのにカードを持っている
    const ghost = { ...p, cards: { ...p.cards, D: { at: 'inventory' } } };
    expect(validateSave({ saveVersion: 1, chapter: 1, savedAt: '', facing: 'north', closeup: null, progress: ghost })).toBeNull();
    // 正解でないのに解錠済み
    const fake = { ...p, door: { dialMinute: 14, unlocked: true } };
    expect(validateSave({ saveVersion: 1, chapter: 1, savedAt: '', facing: 'north', closeup: null, progress: fake })).toBeNull();
    // 鍵を使ったのに箱が閉じている
    const key = { ...p, desk: { rightOpen: true, key: 'used', boxOpen: false } };
    expect(validateSave({ saveVersion: 1, chapter: 1, savedAt: '', facing: 'north', closeup: null, progress: key })).toBeNull();
    // 版が違う
    expect(validateSave({ saveVersion: 99, chapter: 1, savedAt: '', facing: 'north', closeup: null, progress: p })).toBeNull();
  });

  it('はじめから：第1章のデータだけを消し、他の章のデータは残す。壊れたデータは退避', () => {
    localStorage.setItem('study0017.ch2.save', '{"keep":true}');
    localStorage.setItem(SAVE_KEY, '{broken');
    discardSave(true);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{broken');
    expect(localStorage.getItem('study0017.ch2.save')).toBe('{"keep":true}');
  });
});
