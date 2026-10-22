import { BOOK_SOLUTION, CARD_IDS, type BookId, type CardId } from './logic';
import { validateSave } from './save';
import { doorSlots, initialState, reducer, type Action, type GameState } from './state';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const start = () => run(initialState(), { type: 'newGame' }, { type: 'enterStudy' });

/** 現在の並びから正解順へ、入れ替えだけで並べ替える */
function solveBooks(s: GameState): GameState {
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

/** 不変条件：各カードはちょうど1か所。枠は重複しない。鍵は1本 */
function checkInvariants(s: GameState) {
  const p = s.progress;
  const slots = doorSlots(p);
  const inSlots = slots.filter(Boolean);
  expect(new Set(inSlots).size).toBe(inSlots.length);
  for (const id of CARD_IDS) {
    const where = p.cards[id].at;
    expect(['unfound', 'inventory', 'slot']).toContain(where);
    expect(slots.filter((x) => x === id).length).toBe(where === 'slot' ? 1 : 0);
  }
  expect(p.desk.key === 'used').toBe(p.desk.boxOpen);
  expect(validateSave({ saveVersion: 1, chapter: 1, savedAt: '', facing: s.facing, closeup: s.closeup, progress: p })).not.toBeNull();
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

describe('各謎の進行', () => {
  it('本棚：不正解の入れ替えでは開かず、正解で収納が開く。カードは自動取得しない', () => {
    let s = run(start(), { type: 'swapBooks', i: 0, j: 1 });
    expect(s.progress.books.solved).toBe(false);
    s = solveBooks(s);
    expect(s.progress.books).toMatchObject({ order: BOOK_SOLUTION, solved: true, compartmentOpen: true });
    expect(s.progress.cards.A.at).toBe('unfound');
    s = run(s, { type: 'takeCard', id: 'A' });
    expect(s.progress.cards.A.at).toBe('inventory');
    // 解決後は並べ替えできず、収納は閉じない
    s = run(s, { type: 'swapBooks', i: 0, j: 3 });
    expect(s.progress.books.order).toEqual(BOOK_SOLUTION);
    expect(s.progress.books.compartmentOpen).toBe(true);
  });

  it('絵画：A・B・Dを選んでも何も起きず（ペナルティなし）、Cで額が開く', () => {
    let s = run(start(), { type: 'choosePainting', id: 'A' }, { type: 'choosePainting', id: 'B' }, { type: 'choosePainting', id: 'D' });
    expect(s.progress.paintings).toEqual({ solved: false, frameOpen: false });
    expect(s.progress.cards.B.at).toBe('unfound');
    s = run(s, { type: 'choosePainting', id: 'C' });
    expect(s.progress.paintings).toEqual({ solved: true, frameOpen: true });
    expect(s.progress.cards.B.at).toBe('unfound');
  });

  it('机：左・中央は開かない。右→鍵→（選択して）木箱。鍵の取得と解錠は別操作', () => {
    let s = run(start(), { type: 'openDrawer', id: 'left' }, { type: 'openDrawer', id: 'middle' });
    expect(s.progress.desk.rightOpen).toBe(false);
    s = run(s, { type: 'takeKey' });
    expect(s.progress.desk.key).toBe('unfound'); // 引き出しが閉じていると取れない
    s = run(s, { type: 'openDrawer', id: 'right' });
    expect(s.progress.desk).toEqual({ rightOpen: true, key: 'unfound', boxOpen: false });
    s = run(s, { type: 'useKeyOnBox' });
    expect(s.progress.desk.boxOpen).toBe(false); // 鍵がない
    s = run(s, { type: 'takeKey' });
    expect(s.progress.desk.key).toBe('inventory');
    s = run(s, { type: 'useKeyOnBox' });
    expect(s.progress.desk.boxOpen).toBe(false); // 鍵を選んでいない
    s = run(s, { type: 'select', item: { kind: 'key' } }, { type: 'useKeyOnBox' });
    expect(s.progress.desk).toEqual({ rightOpen: true, key: 'used', boxOpen: true });
    expect(s.selected).toBeNull();
    expect(s.progress.cards.C.at).toBe('unfound');
  });

  it('時計：00:14で解決し、カードD取得後に針が00:17へ戻っても解決は保持。再取得できない', () => {
    let s = run(start(), { type: 'adjustClock', delta: -1 });
    expect(s.progress.clock).toMatchObject({ minutes: 16, solved: false });
    s = run(s, { type: 'adjustClock', delta: -2 });
    expect(s.progress.clock).toMatchObject({ minutes: 14, solved: true, compartmentOpen: true });
    s = run(s, { type: 'adjustClock', delta: 5 });
    expect(s.progress.clock.minutes).toBe(14); // 解決後は動かない
    s = run(s, { type: 'takeCard', id: 'D' });
    expect(s.progress.clock).toEqual({ minutes: 17, solved: true, compartmentOpen: true, handsReturned: true });
    s = run(s, { type: 'takeCard', id: 'D' });
    expect(s.progress.cards.D.at).toBe('inventory');
  });

  it('時計：12時間回して 12:14 にしても同じ位置なので解決（アナログ表示）', () => {
    const s = run(start(), { type: 'setClock', minutes: 734 });
    expect(s.progress.clock.solved).toBe(true);
  });
});

describe('テスト9 二重取得', () => {
  it('鍵・カードは二度取れない（未取得の収納からも取れない）', () => {
    let s = start();
    for (const id of CARD_IDS) s = run(s, { type: 'takeCard', id });
    expect(CARD_IDS.every((id) => s.progress.cards[id].at === 'unfound')).toBe(true);
    s = SOLVE.C(run(s));
    s = run(s, { type: 'takeKey' }, { type: 'takeKey' });
    expect(s.progress.desk.key).toBe('used');
    s = run(s, { type: 'takeCard', id: 'C' }, { type: 'takeCard', id: 'C' });
    expect(s.progress.cards.C.at).toBe('inventory');
    s = run(s, { type: 'placeCard', id: 'C', slot: 1 }, { type: 'takeCard', id: 'C' });
    expect(s.progress.cards.C).toEqual({ at: 'slot', index: 1 });
    checkInvariants(s);
  });
});

describe('テスト6 解く順序', () => {
  const orders = permutations<CardId>([...CARD_IDS]);
  it.each(orders.map((o) => [o.join('→'), o]))('%s の順でも扉まで到達し、解錠できる', (_, order) => {
    let s = start();
    for (const id of order as CardId[]) {
      s = SOLVE[id](s);
      checkInvariants(s);
      s = run(s, { type: 'takeCard', id });
      checkInvariants(s);
    }
    // 取得順とは無関係な枠へ一度ずつ置いてから正解へ
    s = run(s, { type: 'placeCard', id: 'A', slot: 0 }, { type: 'placeCard', id: 'B', slot: 1 }, { type: 'placeCard', id: 'C', slot: 2 }, { type: 'placeCard', id: 'D', slot: 3 });
    expect(s.progress.door.unlocked).toBe(false);
    s = run(s, { type: 'adjustDial', delta: -3 });
    expect(s.progress.door.unlocked).toBe(false); // 時刻だけ正解
    s = run(s, { type: 'placeCard', id: 'D', slot: 0 }, { type: 'placeCard', id: 'C', slot: 1 });
    expect(doorSlots(s.progress)).toEqual(['D', 'C', 'B', 'A']);
    expect(s.progress.door.unlocked).toBe(true);
    checkInvariants(s);
  });
});

describe('テスト5・10 扉', () => {
  const allCards = () => {
    let s = start();
    for (const id of CARD_IDS) s = run(SOLVE[id](s), { type: 'takeCard', id });
    return s;
  };

  it('4枚そろう前でも置ける・外せる。置き先にあったカードは持ち物か元の枠へ戻る', () => {
    let s = run(SOLVE.A(start()), { type: 'takeCard', id: 'A' });
    s = run(s, { type: 'placeCard', id: 'A', slot: 2 });
    expect(doorSlots(s.progress)).toEqual([null, null, 'A', null]);
    s = run(s, { type: 'removeCard', slot: 2 });
    expect(s.progress.cards.A.at).toBe('inventory');
    s = run(s, { type: 'placeCard', id: 'B', slot: 0 }); // 持っていないカード
    expect(doorSlots(s.progress)).toEqual([null, null, null, null]);

    s = allCards();
    s = run(s, { type: 'placeCard', id: 'A', slot: 0 }, { type: 'placeCard', id: 'B', slot: 1 });
    s = run(s, { type: 'placeCard', id: 'C', slot: 0 }); // 持ち物から → 枠0のAは持ち物へ
    expect(doorSlots(s.progress)).toEqual(['C', 'B', null, null]);
    expect(s.progress.cards.A.at).toBe('inventory');
    s = run(s, { type: 'placeCard', id: 'B', slot: 0 }); // 枠1から枠0へ → 入れ替え
    expect(doorSlots(s.progress)).toEqual(['B', 'C', null, null]);
    checkInvariants(s);
  });

  it('解錠後はカードを外せず、ダイヤルも動かない。先へ進める', () => {
    let s = allCards();
    expect(run(s, { type: 'proceed' }).screen).toBe('explore'); // 未解錠では進めない
    s = run(
      s,
      { type: 'placeCard', id: 'D', slot: 0 },
      { type: 'placeCard', id: 'C', slot: 1 },
      { type: 'placeCard', id: 'B', slot: 2 },
      { type: 'placeCard', id: 'A', slot: 3 },
    );
    expect(s.progress.door.unlocked).toBe(false); // ダイヤルが 00:17 のまま
    expect(s.monologue).toContain('動かない');
    s = run(s, { type: 'adjustDial', delta: -3 });
    expect(s.progress.door.unlocked).toBe(true);
    s = run(s, { type: 'removeCard', slot: 0 }, { type: 'adjustDial', delta: 1 });
    expect(doorSlots(s.progress)).toEqual(['D', 'C', 'B', 'A']);
    expect(s.progress.door.dialMinute).toBe(14);
    expect(run(s, { type: 'proceed' }).screen).toBe('ending');
  });
});

describe('テスト9 カードの保存則（ランダム操作）', () => {
  it('どんな操作列でもカード・鍵は消えず増えない', () => {
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const ids = CARD_IDS;
    const gen = (): Action => {
      switch (rnd(12)) {
        case 0:
          return { type: 'swapBooks', i: rnd(4), j: rnd(4) };
        case 1:
          return { type: 'choosePainting', id: (['A', 'B', 'C', 'D'] as const)[rnd(4)] };
        case 2:
          return { type: 'openDrawer', id: (['left', 'middle', 'right'] as const)[rnd(3)] };
        case 3:
          return { type: 'takeKey' };
        case 4:
          return { type: 'select', item: rnd(2) ? { kind: 'key' } : { kind: 'card', id: ids[rnd(4)] } };
        case 5:
          return { type: 'useKeyOnBox' };
        case 6:
          return { type: 'adjustClock', delta: rnd(7) - 3 };
        case 7:
          return { type: 'takeCard', id: ids[rnd(4)] };
        case 8:
        case 9:
          return { type: 'placeCard', id: ids[rnd(4)], slot: rnd(4) };
        case 10:
          return { type: 'removeCard', slot: rnd(4) };
        default:
          return { type: 'adjustDial', delta: rnd(7) - 3 };
      }
    };
    for (let run = 0; run < 120; run++) {
      let s = start();
      for (let k = 0; k < 150; k++) {
        s = reducer(s, gen());
        checkInvariants(s);
      }
    }
  }, 30_000);
});
