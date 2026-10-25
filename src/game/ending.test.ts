import { BOOK_SOLUTION, CARD_IDS, type BookId, type CardId } from './logic';
import { AUDIO_CUES, ENDING_MS, SCENES_T, SUBTITLES, TITLE_CARD_AT, sceneAt, subtitleAt } from './ending';
import { SAVE_VERSION, migrate, validateSave } from './save';
import { initialState, reducer, type Action, type GameState } from './state';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
function solveAll(): GameState {
  let s = run(initialState(), { type: 'newGame' }, { type: 'enterStudy' });
  for (let i = 0; i < 4; i++) {
    const j = s.progress.books.order.indexOf(BOOK_SOLUTION[i] as BookId);
    if (j !== i) s = reducer(s, { type: 'swapBooks', i, j });
  }
  s = run(s, { type: 'choosePainting', id: 'C' }, { type: 'openDrawer', id: 'right' }, { type: 'takeKey' }, { type: 'select', item: { kind: 'key' } }, { type: 'useKeyOnBox' }, { type: 'adjustClock', delta: -3 });
  for (const id of CARD_IDS) s = run(s, { type: 'takeCard', id: id as CardId });
  for (let i = 0; i < 7; i++) s = run(s, { type: 'tick' });
  return run(s, { type: 'placeCard', id: 'D', slot: 0 }, { type: 'placeCard', id: 'C', slot: 1 }, { type: 'placeCard', id: 'B', slot: 2 }, { type: 'placeCard', id: 'A', slot: 3 }, { type: 'adjustDial', delta: -3 });
}
const valid = (s: GameState) => validateSave({ saveVersion: SAVE_VERSION, chapter: 1, savedAt: '', facing: s.facing, closeup: s.closeup, progress: s.progress });

describe('ラストシーンの台本', () => {
  it('5つの場面が 0〜28秒を隙間なく埋める', () => {
    expect(SCENES_T.map((s) => s.id)).toEqual(['hall', 'farDoor', 'studyB', 'clockB', 'end']);
    for (let i = 1; i < SCENES_T.length; i++) expect(SCENES_T[i].from).toBe(SCENES_T[i - 1].to);
    expect(SCENES_T.at(-1)!.to).toBe(ENDING_MS);
    expect(sceneAt(12_000)).toBe('studyB');
    expect(sceneAt(18_000)).toBe('clockB');
  });

  it('テスト6：字幕は8行すべて、1.5秒以上表示し、重ならず、場面の中に収まる（途中で切れない）', () => {
    expect(SUBTITLES.map((s) => s.text)).toEqual([
      '……まだ、屋敷の中なのか？',
      '奥にも、部屋がある……？',
      '……え？',
      'この部屋……さっきの……？',
      '……0時14分？',
      'さっきの時計は、0時17分だったはず……。',
      'だとしたら……',
      'あの部屋は、いったい何だったんだ？',
    ]);
    for (let i = 0; i < SUBTITLES.length; i++) {
      const s = SUBTITLES[i];
      expect(s.to - s.from, s.text).toBeGreaterThanOrEqual(1500);
      if (i > 0) expect(s.from).toBeGreaterThanOrEqual(SUBTITLES[i - 1].to);
      expect(sceneAt(s.from)).toBe(sceneAt(s.to - 1));
      expect(subtitleAt((s.from + s.to) / 2)).toBe(s.text);
    }
    expect(TITLE_CARD_AT).toBeGreaterThanOrEqual(SUBTITLES.at(-1)!.to);
  });

  it('音：reveal は通路で流し、書斎Bが現れる11秒までに止める。足音は通路の冒頭', () => {
    const at = (k: string) => AUDIO_CUES.find((c) => c.key === k || c.kind === k)!.at;
    expect(at('reveal')).toBe(0);
    expect(at('footsteps_hallway')).toBeLessThan(5000);
    expect(at('stopBgm')).toBeLessThanOrEqual(11_000);
    expect(at('stopBgm')).toBeGreaterThan(at('door_open'));
  });
});

describe('エンディングの進行状態', () => {
  it('解錠 → 先へ進む（再生中）→ 完了（章クリア）。クリア時間は解錠時で固定', () => {
    let s = solveAll();
    expect(s.progress.door.unlocked).toBe(true);
    expect(s.progress.clearSeconds).toBe(7);
    expect(s.progress.ending).toBe('none');
    s = run(s, { type: 'turn', dir: 1 }); // 先へ進むまでは自由に再調査できる
    s = run(s, { type: 'proceed' });
    expect(s.screen).toBe('ending');
    expect(s.progress.ending).toBe('playing');
    expect(valid(s)).not.toBeNull();
    for (let i = 0; i < 30; i++) s = run(s, { type: 'tick' });
    s = run(s, { type: 'completeEnding' });
    expect(s.screen).toBe('clear');
    expect(s.progress).toMatchObject({ ending: 'done', chapterCompleted: true, revisiting: false, clearSeconds: 7 });
    expect(s.progress.clearedAt).toEqual(expect.any(String));
    expect(valid(s)).not.toBeNull();
  });

  it('再調査・見返しを繰り返しても、謎・記録・クリア日時は変わらない', () => {
    let s = run(solveAll(), { type: 'proceed' }, { type: 'completeEnding' });
    const clearedAt = s.progress.clearedAt;
    const snapshot = JSON.stringify({ ...s.progress, afterClearSeconds: 0, revisiting: false });
    for (let k = 0; k < 3; k++) {
      s = run(s, { type: 'startRevisit' });
      expect(s.screen).toBe('explore');
      expect(s.progress.revisiting).toBe(true);
      s = run(s, { type: 'proceed' }); // 再調査中に先へ進む → 見返し
      expect(s.endingReplay).toBe(true);
      s = run(s, { type: 'completeEnding' });
      s = run(s, { type: 'replayEnding' }, { type: 'completeEnding' });
      expect(s.screen).toBe('clear');
    }
    expect(s.progress.clearedAt).toBe(clearedAt);
    expect(JSON.stringify({ ...s.progress, afterClearSeconds: 0, revisiting: false })).toBe(snapshot);
    expect(valid(s)).not.toBeNull();
  });

  it('未解錠では先へ進めず、エンディング完了も起きない', () => {
    let s = run(initialState(), { type: 'newGame' }, { type: 'enterStudy' }, { type: 'proceed' }, { type: 'completeEnding' });
    expect(s.screen).toBe('explore');
    expect(s.progress.chapterCompleted).toBe(false);
    s = run(s, { type: 'replayEnding' }, { type: 'startRevisit' });
    expect(s.screen).toBe('explore');
  });

  it('再開先：再生中ならエンディング冒頭、クリア済みならクリア画面、再調査中なら探索', () => {
    const s = run(solveAll(), { type: 'proceed' });
    const cont = (p: GameState['progress']) => run(initialState(), { type: 'continueGame', progress: p, facing: 'south', closeup: 'door' });
    expect(cont(s.progress).screen).toBe('ending');
    const done = run(s, { type: 'completeEnding' });
    expect(cont(done.progress).screen).toBe('clear');
    const rev = run(done, { type: 'startRevisit' });
    expect(cont(rev.progress).screen).toBe('explore');
  });

  it('保存データ：矛盾した状態を読み込まない／v2 から移行できる', () => {
    const s = solveAll();
    const base = { saveVersion: SAVE_VERSION, chapter: 1, savedAt: '', facing: 'south', closeup: null };
    expect(validateSave({ ...base, progress: { ...s.progress, chapterCompleted: true } })).toBeNull(); // エンディング未完了なのにクリア
    expect(validateSave({ ...base, progress: { ...s.progress, revisiting: true } })).toBeNull();
    const fresh = run(initialState(), { type: 'newGame' }, { type: 'enterStudy' });
    expect(validateSave({ ...base, progress: { ...fresh.progress, ending: 'playing' } })).toBeNull(); // 未解錠で再生中
    const { ending: _e, chapterCompleted: _c, clearedAt: _d, revisiting: _r, ...v2progress } = s.progress;
    const m = migrate({ ...base, saveVersion: 2, progress: v2progress }) as { saveVersion: number; progress: GameState['progress'] };
    expect(m.saveVersion).toBe(SAVE_VERSION);
    expect(m.progress.ending).toBe('none');
    expect(validateSave(m)).not.toBeNull();
  });
});
