import {
  BOOK_INITIAL,
  BOOK_SOLUTION,
  CARD_IDS,
  CARDS,
  DOOR_SOLUTION,
  countTrueDrawers,
  drawerClaims,
  drawerWithKey,
  isBookOrderSolved,
  isClockSolved,
  isDoorOrderCorrect,
  isDoorSolved,
  isPaintingCorrect,
  type BookId,
  type CardId,
} from './logic';

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

describe('テスト1 本棚', () => {
  const all = permutations<BookId>(['blue', 'ivory', 'black', 'green']);
  it('24通りのうち、青→白→黒→緑だけが正解', () => {
    expect(all).toHaveLength(24);
    const ok = all.filter(isBookOrderSolved);
    expect(ok).toEqual([['blue', 'ivory', 'black', 'green']]);
    expect(BOOK_SOLUTION).toEqual(['blue', 'ivory', 'black', 'green']);
  });
  it('開始時の並び（緑・黒・白・青）は正解ではない', () => {
    expect(BOOK_INITIAL).toEqual(['green', 'black', 'ivory', 'blue']);
    expect(isBookOrderSolved(BOOK_INITIAL)).toBe(false);
  });
  it('重複や欠けのある並びは不正解', () => {
    expect(isBookOrderSolved(['blue', 'blue', 'black', 'green'])).toBe(false);
    expect(isBookOrderSolved(['blue', 'ivory', 'black'])).toBe(false);
  });
});

describe('テスト2 絵画', () => {
  it('Cだけが不自然（正解）、A・B・Dは正常（不正解）', () => {
    expect(isPaintingCorrect('A')).toBe(false);
    expect(isPaintingCorrect('B')).toBe(false);
    expect(isPaintingCorrect('C')).toBe(true);
    expect(isPaintingCorrect('D')).toBe(false);
  });
});

describe('テスト3 机', () => {
  it('鍵が左→真2枚、中央→真2枚、右→真1枚', () => {
    expect(countTrueDrawers('left')).toBe(2);
    expect(countTrueDrawers('middle')).toBe(2);
    expect(countTrueDrawers('right')).toBe(1);
  });
  it('鍵が右のとき、真実なのは中央の札だけ', () => {
    expect(drawerClaims('right')).toEqual({ left: false, middle: true, right: false });
    expect(drawerWithKey()).toBe('right');
  });
});

describe('テスト4 時計', () => {
  it('00:14 だけが正解（00:17 から3分戻す）', () => {
    const ok = Array.from({ length: 720 }, (_, m) => m).filter(isClockSolved);
    expect(ok).toEqual([14]);
    expect(isClockSolved(17)).toBe(false);
    expect(isClockSolved(14 + 720)).toBe(true); // アナログ時計は12時間で一周
  });
});

describe('テスト5 扉', () => {
  const all = permutations<CardId>([...CARD_IDS]);
  it('カード表の内容（設計書§10）', () => {
    expect(CARDS.A).toMatchObject({ time: '00:05', symbol: '△', text: '訪問者が来た' });
    expect(CARDS.B).toMatchObject({ time: '00:08', symbol: '□', text: '照明が消えた' });
    expect(CARDS.C).toMatchObject({ time: '00:11', symbol: '○', text: '二人の足音が聞こえた' });
    expect(CARDS.D).toMatchObject({ time: '00:14', symbol: '◇', text: '扉が施錠された' });
  });
  it('正解の並びは ◇○□△（D,C,B,A）', () => {
    expect(DOOR_SOLUTION).toEqual(['D', 'C', 'B', 'A']);
    expect(DOOR_SOLUTION.map((id) => CARDS[id].symbol).join('')).toBe('◇○□△');
  });
  it('24順列 × 60通りのダイヤルで、D,C,B,A かつ 00:14 の1通りだけ開く', () => {
    let opened = 0;
    for (const order of all) for (let m = 0; m < 60; m++) if (isDoorSolved(order, m)) opened++;
    expect(opened).toBe(1);
    expect(isDoorSolved(['D', 'C', 'B', 'A'], 14)).toBe(true);
  });
  it('ダイヤルだけ正解・順序だけ正解では開かない', () => {
    expect(isDoorSolved(['A', 'B', 'C', 'D'], 14)).toBe(false);
    expect(isDoorSolved(['D', 'C', 'B', 'A'], 17)).toBe(false);
    expect(isDoorOrderCorrect(['D', 'C', 'B', 'A'])).toBe(true);
  });
  it('カード不足では開かない', () => {
    expect(isDoorSolved(['D', 'C', 'B', null], 14)).toBe(false);
    expect(isDoorSolved([null, null, null, null], 14)).toBe(false);
  });
});
