import { BOOK_SOLUTION, CARD_IDS, type BookId, type CardId } from './logic';
import { explorationGuide } from './guide';
import { OPTIONAL_IDS, optionalAvailable } from './optional';
import { CORRUPT_KEY, PREV_KEY, SAVE_KEY, SAVE_VERSION, loadSave, migrate, restoreBackup, validateSave, writeSave } from './save';
import { initialProgress, initialState, reducer, type Action, type GameState } from './state';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const start = () => run(initialState(), { type: 'newGame' }, { type: 'enterStudy' });
function solveBooks(s: GameState) {
  for (let i = 0; i < 4; i++) {
    const j = s.progress.books.order.indexOf(BOOK_SOLUTION[i] as BookId);
    if (j !== i) s = reducer(s, { type: 'swapBooks', i, j });
  }
  return s;
}
const SOLVE: Record<CardId, (s: GameState) => GameState> = {
  A: solveBooks,
  B: (s) => run(s, { type: 'choosePainting', id: 'C' }),
  C: (s) => run(s, { type: 'openDrawer', id: 'right' }, { type: 'takeKey' }, { type: 'select', item: { kind: 'key' } }, { type: 'useKeyOnBox' }),
  D: (s) => run(s, { type: 'adjustClock', delta: -3 }),
};
const take = (s: GameState, id: CardId) => run(SOLVE[id](s), { type: 'takeCard', id });
const unlock = (s: GameState) => {
  for (const id of CARD_IDS) s = take(s, id);
  return run(
    s,
    { type: 'placeCard', id: 'D', slot: 0 },
    { type: 'placeCard', id: 'C', slot: 1 },
    { type: 'placeCard', id: 'B', slot: 2 },
    { type: 'placeCard', id: 'A', slot: 3 },
    { type: 'adjustDial', delta: -3 },
  );
};

describe('任意調査（6件）', () => {
  it('O1・O5・O6は最初から、O2・O3・O4は対応する謎の後に調べられる', () => {
    let s = start();
    expect(OPTIONAL_IDS.filter((id) => optionalAvailable(s.progress, id))).toEqual(['O1', 'O5', 'O6']);
    s = run(s, { type: 'discover', id: 'O2' }, { type: 'discover', id: 'O3' }, { type: 'discover', id: 'O4' });
    expect(s.progress.optionalNotes).toEqual([]);
    s = run(solveBooks(s), { type: 'choosePainting', id: 'C' }, { type: 'openDrawer', id: 'right' });
    expect(OPTIONAL_IDS.every((id) => optionalAvailable(s.progress, id))).toBe(true);
  });

  it('発見は1回だけ記録され、2回目は独白だけ（再取得の演出なし）', () => {
    let s = run(start(), { type: 'discover', id: 'O5' });
    expect(s.progress.optionalNotes).toEqual(['O5']);
    expect(s.fx?.key).toBe('note');
    const n = s.fx?.n;
    s = run(s, { type: 'discover', id: 'O5' });
    expect(s.progress.optionalNotes).toEqual(['O5']);
    expect(s.fx?.n).toBe(n);
    expect(s.monologue).toContain('蝶番');
  });

  it('任意調査0件でも解錠でき、解錠後に6件まで集められる', () => {
    let s = unlock(start());
    expect(s.progress.door.unlocked).toBe(true);
    expect(s.progress.optionalNotes).toHaveLength(0);
    for (const id of OPTIONAL_IDS) s = run(s, { type: 'discover', id });
    expect(s.progress.optionalNotes).toHaveLength(6);
  });
});

describe('一度きりのイベント', () => {
  it('2枚目で物音、4枚目で静寂。どちらも一度だけ', () => {
    let s = take(start(), 'B');
    expect(s.progress.eventsSeen).toEqual([]);
    s = take(s, 'D');
    expect(s.progress.eventsSeen).toEqual(['knock']);
    expect(s.fx?.key).toBe('card-take-D|knock');
    expect(s.monologue).toContain('コトッ');
    s = take(s, 'A');
    expect(s.fx?.key).toBe('card-take');
    expect(s.monologue).not.toContain('コトッ');
    s = take(s, 'C');
    expect(s.progress.eventsSeen).toEqual(['knock', 'silence']);
    expect(s.fx?.key).toBe('card-take|silence');
  });

  it('扉に置いてもカードを持っている数は変わらず、イベントは再発しない', () => {
    let s = take(take(start(), 'A'), 'B');
    const before = s.fx?.n;
    s = run(s, { type: 'placeCard', id: 'A', slot: 0 }, { type: 'removeCard', slot: 0 });
    expect(s.progress.eventsSeen).toEqual(['knock']);
    expect(s.fx?.key.includes('knock')).toBe(false);
    expect(s.fx?.n).toBeGreaterThan(before!);
  });
});

describe('時間の記録', () => {
  it('探索中だけ数え、解錠の瞬間にクリア時間を固定。以後は別カウンター', () => {
    let s = initialState();
    s = run(s, { type: 'tick' });
    expect(s.progress.playSeconds).toBe(0); // タイトルでは数えない
    s = start();
    for (let i = 0; i < 5; i++) s = run(s, { type: 'tick' });
    expect(s.progress.playSeconds).toBe(5);
    s = unlock(s);
    expect(s.progress.clearSeconds).toBe(5);
    for (let i = 0; i < 3; i++) s = run(s, { type: 'tick' });
    expect(s.progress.playSeconds).toBe(5);
    expect(s.progress.clearSeconds).toBe(5);
    expect(s.progress.afterClearSeconds).toBe(3);
  });

  it('オープニングの見返し中は数えず、終わると元の向きに戻る', () => {
    let s = run(start(), { type: 'turn', dir: 1 }, { type: 'turn', dir: 1 });
    s = run(s, { type: 'replayOpening' });
    expect(s.screen).toBe('opening');
    s = run(s, { type: 'tick' });
    expect(s.progress.playSeconds).toBe(0);
    s = run(s, { type: 'enterStudy' });
    expect(s.screen).toBe('explore');
    expect(s.facing).toBe('south');
  });
});

describe('探索サポート', () => {
  it('取り忘れたカード、4枚そろった後の扉、解錠後を案内する（任意調査の場所は出さない）', () => {
    let s = start();
    expect(explorationGuide(s.progress).join()).toContain('北の本棚');
    s = SOLVE.B(s);
    expect(explorationGuide(s.progress)).toEqual(['西の絵画の裏に、まだ取っていない記録がある。']);
    s = run(s, { type: 'takeCard', id: 'B' });
    expect(explorationGuide(s.progress).join()).not.toContain('西の絵画');
    s = run(s, { type: 'openDrawer', id: 'right' }, { type: 'takeKey' });
    expect(explorationGuide(s.progress).join()).toContain('小さな鍵を使える場所');
    s = unlock(start());
    expect(explorationGuide(s.progress)).toEqual(['扉の錠は外れた。南の扉から先へ進める。']);
    const all = explorationGuide(initialProgress()).join();
    expect(all).not.toMatch(/写真|蝶番|金具|刻印|傷|手紙/);
  });
});

describe('セーブの詳細', () => {
  beforeEach(() => localStorage.clear());

  it('v1 のデータを v2 へ移行して読める（取得順・イベント・時間を補う）', () => {
    const p = take(take(start(), 'A'), 'B').progress;
    const { acquired: _a, playSeconds: _p, clearSeconds: _c, afterClearSeconds: _f, ...v1progress } = p;
    const v1 = { saveVersion: 1, chapter: 1, savedAt: '', facing: 'west', closeup: null, progress: { ...v1progress, eventsSeen: [] } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(v1));
    const r = loadSave();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.migrated).toBe(true);
      expect(r.data.saveVersion).toBe(SAVE_VERSION);
      expect(r.data.progress.acquired).toEqual(['A', 'B']);
      expect(r.data.progress.eventsSeen).toEqual(['knock']);
      expect(r.data.progress.playSeconds).toBe(0);
    }
    expect(migrate({ saveVersion: 0 })).toBeNull();
  });

  it('上書きのたびに、ひとつ前の保存を予備に残す。本体が壊れたら予備から再開できる', () => {
    const s1 = start();
    const s2 = run(s1, { type: 'swapBooks', i: 0, j: 1 });
    writeSave({ facing: 'north', closeup: null, progress: s1.progress });
    writeSave({ facing: 'east', closeup: null, progress: s2.progress });
    expect(JSON.parse(localStorage.getItem(PREV_KEY)!).facing).toBe('north');
    localStorage.setItem(SAVE_KEY, '{"saveVersion":2,"broken":');
    const r = loadSave();
    expect(r.status).toBe('corrupt');
    if (r.status === 'corrupt') {
      expect(r.backup?.facing).toBe('north');
      expect(r.raw).toContain('broken');
    }
    const restored = restoreBackup();
    expect(restored?.facing).toBe('north');
    expect(localStorage.getItem(CORRUPT_KEY)).toContain('broken');
    expect(loadSave().status).toBe('ok');
  });

  it('壊れた本体で予備を上書きしない', () => {
    writeSave({ facing: 'north', closeup: null, progress: start().progress });
    localStorage.setItem(SAVE_KEY, 'garbage');
    writeSave({ facing: 'south', closeup: null, progress: start().progress });
    expect(localStorage.getItem(PREV_KEY)).not.toBe('garbage');
  });

  it('時間・取得順・イベントの矛盾は読み込まない', () => {
    const p = take(take(start(), 'A'), 'B').progress;
    const base = { saveVersion: SAVE_VERSION, chapter: 1, savedAt: '', facing: 'north', closeup: null };
    expect(validateSave({ ...base, progress: p })).not.toBeNull();
    expect(validateSave({ ...base, progress: { ...p, acquired: ['A'] } })).toBeNull();
    expect(validateSave({ ...base, progress: { ...p, acquired: ['A', 'A'] } })).toBeNull();
    expect(validateSave({ ...base, progress: { ...p, eventsSeen: [] } })).toBeNull();
    expect(validateSave({ ...base, progress: { ...p, clearSeconds: 3 } })).toBeNull(); // 未解錠なのにクリア時間
    expect(validateSave({ ...base, progress: { ...p, optionalNotes: ['O4'] } })).toBeNull(); // 右の引き出しが開いていないのにO4
    expect(validateSave({ ...base, progress: { ...p, playSeconds: -1 } })).toBeNull();
  });
});
