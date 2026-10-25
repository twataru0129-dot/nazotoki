// 5つの謎の判定。すべて純粋関数（状態を持たない）。正解は設計書§5〜§9の確定仕様。

// ---------- 本棚 ----------
export type BookId = 'blue' | 'ivory' | 'black' | 'green';
export type BookSymbol = 'moon' | 'wave' | 'leaf' | 'star' | 'sun';

export const BOOKS: Record<BookId, { name: string; left: BookSymbol; right: BookSymbol }> = {
  blue: { name: '青', left: 'moon', right: 'wave' },
  ivory: { name: '白', left: 'wave', right: 'leaf' },
  black: { name: '黒', left: 'leaf', right: 'star' },
  green: { name: '緑', left: 'star', right: 'sun' },
};
export const SYMBOL_NAME: Record<BookSymbol, string> = { moon: '月', wave: '波', leaf: '葉', star: '星', sun: '太陽' };

/** 初期の並び（緑→黒→白→青）。正解順ではない */
export const BOOK_INITIAL: BookId[] = ['green', 'black', 'ivory', 'blue'];
export const BOOK_SOLUTION: BookId[] = ['blue', 'ivory', 'black', 'green'];

/** 棚の左端の月から右端の太陽まで、隣り合う本の記号がすべてつながっていれば正解 */
export function isBookOrderSolved(order: readonly BookId[]): boolean {
  if (order.length !== 4 || new Set(order).size !== 4) return false;
  if (BOOKS[order[0]].left !== 'moon' || BOOKS[order[3]].right !== 'sun') return false;
  return order.every((b, i) => i === 0 || BOOKS[order[i - 1]].right === BOOKS[b].left);
}

export function swapBooks(order: readonly BookId[], i: number, j: number): BookId[] {
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ---------- 絵画 ----------
export type PaintingId = 'A' | 'B' | 'C' | 'D';
export type Direction = 'left' | 'right' | 'top' | 'bottom';
export const PAINTINGS: Record<PaintingId, { light: Direction; shadow: Direction }> = {
  A: { light: 'left', shadow: 'right' },
  B: { light: 'top', shadow: 'bottom' },
  C: { light: 'right', shadow: 'right' },
  D: { light: 'bottom', shadow: 'top' },
};
const OPPOSITE: Record<Direction, Direction> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

/** 正解の絵か。影は光の反対へ伸びるはずで、そうなっていない絵（＝嘘をついている絵）が正解 */
export function isPaintingCorrect(id: PaintingId): boolean {
  const p = PAINTINGS[id];
  return OPPOSITE[p.light] !== p.shadow;
}

// ---------- 机 ----------
export type DrawerId = 'left' | 'middle' | 'right';
export const DRAWERS: DrawerId[] = ['left', 'middle', 'right'];

/** 各札が真かどうか（鍵が keyAt にあると仮定したとき） */
export function drawerClaims(keyAt: DrawerId): Record<DrawerId, boolean> {
  return {
    left: keyAt === 'middle', // 「鍵は中央にある」
    middle: keyAt !== 'middle', // 「鍵は中央にはない」
    right: keyAt !== 'right', // 「鍵は右にはない」
  };
}

export function countTrueDrawers(keyAt: DrawerId): number {
  return Object.values(drawerClaims(keyAt)).filter(Boolean).length;
}

/** 「真実を語る札は、ただ一枚」を満たす引き出し（＝鍵の場所） */
export function drawerWithKey(): DrawerId {
  const ok = DRAWERS.filter((d) => countTrueDrawers(d) === 1);
  if (ok.length !== 1) throw new Error('机の謎の答えが一意ではない');
  return ok[0];
}

// ---------- 時計 ----------
/** 時刻は「0時からの分」で持つ。アナログ時計なので12時間で一周する */
export const CLOCK_STOPPED = 17;
export const CLOCK_ADVANCE = 3;
export const CLOCK_SOLUTION = CLOCK_STOPPED - CLOCK_ADVANCE; // 14

export function normalizeClock(totalMinutes: number): number {
  return ((totalMinutes % 720) + 720) % 720;
}

export function isClockSolved(totalMinutes: number): boolean {
  return normalizeClock(totalMinutes) === CLOCK_SOLUTION;
}

// ---------- 扉 ----------
export type CardId = 'A' | 'B' | 'C' | 'D';
export const CARD_IDS: CardId[] = ['A', 'B', 'C', 'D'];

/** §10 記録カード */
export const CARDS: Record<CardId, { time: string; minute: number; symbol: string; symbolName: string; text: string; source: string }> = {
  A: { time: '00:05', minute: 5, symbol: '△', symbolName: '三角', text: '訪問者が来た', source: '本棚' },
  B: { time: '00:08', minute: 8, symbol: '□', symbolName: '四角', text: '照明が消えた', source: '絵画C' },
  C: { time: '00:11', minute: 11, symbol: '○', symbolName: '丸', text: '二人の足音が聞こえた', source: '机の小箱' },
  D: { time: '00:14', minute: 14, symbol: '◇', symbolName: 'ひし形', text: '扉が施錠された', source: '時計' },
};

export const DOOR_DIAL_SOLUTION = 14;
/** 扉のダイヤルは 00:00〜00:59 */
export function normalizeDial(minute: number): number {
  return ((minute % 60) + 60) % 60;
}

/** 終わりから始まりへ＝時刻の遅い順（◇○□△） */
export const DOOR_SOLUTION: CardId[] = [...CARD_IDS].sort((a, b) => CARDS[b].minute - CARDS[a].minute);

export function isDoorOrderCorrect(slots: readonly (CardId | null)[]): boolean {
  return slots.length === 4 && slots.every((c, i) => c === DOOR_SOLUTION[i]);
}

/** 4枚がすべて枠にあり、順序が正しく、ダイヤルが 00:14 のときだけ開く */
export function isDoorSolved(slots: readonly (CardId | null)[], dialMinute: number): boolean {
  return isDoorOrderCorrect(slots) && normalizeDial(dialMinute) === DOOR_DIAL_SOLUTION;
}
