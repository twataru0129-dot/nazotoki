import { BOOK_INITIAL, CARD_IDS, isBookOrderSolved, isClockSolved, isDoorSolved, type BookId } from './logic';
import { doorSlots, type Progress } from './state';
import { FACINGS, PUZZLES, type CloseupId, type Facing } from './types';

// 第1章の進行を端末に自動保存する（最小限。履歴・バックアップ選択などの詳細は第3段階）。
// 章ごとに別キーで保存し、第1章の「はじめから」で他の章のデータを消さない。
export const SAVE_KEY = 'study0017.ch1.save';
export const CORRUPT_KEY = 'study0017.ch1.save.corrupt';
export const SAVE_VERSION = 1;

export interface SaveData {
  saveVersion: number;
  chapter: 1;
  savedAt: string;
  facing: Facing;
  closeup: CloseupId | null;
  progress: Progress;
}

const CLOSEUPS: CloseupId[] = ['bookshelf', 'paintings', 'desk', 'clock', 'door', 'window'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** 形式と不変条件を検査する。1つでも矛盾があれば null（カードの消失・複製を含むデータは読み込まない） */
export function validateSave(raw: unknown): SaveData | null {
  if (!isObj(raw) || raw.saveVersion !== SAVE_VERSION || raw.chapter !== 1) return null;
  if (!FACINGS.includes(raw.facing as Facing)) return null;
  if (raw.closeup !== null && !CLOSEUPS.includes(raw.closeup as CloseupId)) return null;
  const p = raw.progress;
  if (!isObj(p)) return null;
  const { books, paintings, desk, clock, door, cards, hintLevels, optionalNotes, eventsSeen } = p;
  if (!isObj(books) || !isObj(paintings) || !isObj(desk) || !isObj(clock) || !isObj(door) || !isObj(cards) || !isObj(hintLevels)) return null;

  // 本棚
  const order = books.order;
  if (!Array.isArray(order) || order.length !== 4 || new Set(order).size !== 4 || !order.every((b) => BOOK_INITIAL.includes(b as BookId))) return null;
  if (!isBool(books.solved) || !isBool(books.compartmentOpen)) return null;
  if (books.solved !== isBookOrderSolved(order as BookId[]) || books.compartmentOpen !== books.solved) return null;
  // 絵画
  if (!isBool(paintings.solved) || !isBool(paintings.frameOpen) || paintings.frameOpen !== paintings.solved) return null;
  // 机：鍵は 未取得／持ち物／使用済み。使用済み⇔箱が開いている。鍵を取れるのは右の引き出しが開いてから
  if (!isBool(desk.rightOpen) || !isBool(desk.boxOpen) || !['unfound', 'inventory', 'used'].includes(desk.key as string)) return null;
  if ((desk.key === 'used') !== desk.boxOpen) return null;
  if (desk.key !== 'unfound' && !desk.rightOpen) return null;
  // 時計
  if (!isInt(clock.minutes, 0, 719) || !isBool(clock.solved) || !isBool(clock.compartmentOpen) || !isBool(clock.handsReturned)) return null;
  if (clock.compartmentOpen !== clock.solved) return null;
  if (!clock.solved && isClockSolved(clock.minutes)) return null;
  // 解決後の針は 00:14 のまま。カードDを取ると 00:17 へ戻る
  if (clock.solved && clock.minutes !== (clock.handsReturned ? 17 : 14)) return null;
  // 扉
  if (!isInt(door.dialMinute, 0, 59) || !isBool(door.unlocked)) return null;
  // カード：場所は1か所だけ。枠は重複しない。収納が開いていないカードは持てない
  const used = new Set<number>();
  for (const id of CARD_IDS) {
    const loc = cards[id];
    if (!isObj(loc)) return null;
    if (loc.at === 'slot') {
      if (!isInt(loc.index, 0, 3) || used.has(loc.index)) return null;
      used.add(loc.index);
    } else if (loc.at !== 'unfound' && loc.at !== 'inventory') return null;
  }
  const prog = p as unknown as Progress;
  const opened = { A: books.compartmentOpen, B: paintings.frameOpen, C: desk.boxOpen, D: clock.compartmentOpen };
  for (const id of CARD_IDS) if (prog.cards[id].at !== 'unfound' && !opened[id]) return null;
  if (clock.handsReturned !== (prog.cards.D.at !== 'unfound')) return null;
  if (door.unlocked && !isDoorSolved(doorSlots(prog), door.dialMinute)) return null;
  // ヒント・任意調査・イベント
  if (!PUZZLES.every((k) => isInt(hintLevels[k], 0, 3))) return null;
  if (!Array.isArray(optionalNotes) || !Array.isArray(eventsSeen)) return null;
  return raw as unknown as SaveData;
}

export type LoadResult = { status: 'none' } | { status: 'ok'; data: SaveData } | { status: 'corrupt' } | { status: 'unavailable' };

export function loadSave(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'none' };
  try {
    const data = validateSave(JSON.parse(raw));
    if (data) return { status: 'ok', data };
  } catch {
    /* JSON として読めない */
  }
  return { status: 'corrupt' };
}

/** 保存できたら true。失敗してもゲームは続けられる */
export function writeSave(data: Omit<SaveData, 'saveVersion' | 'chapter' | 'savedAt'>): boolean {
  try {
    const full: SaveData = { saveVersion: SAVE_VERSION, chapter: 1, savedAt: new Date().toISOString(), ...data };
    localStorage.setItem(SAVE_KEY, JSON.stringify(full));
    return true;
  } catch {
    return false;
  }
}

/** 壊れたデータは消さずに退避してから、第1章の保存だけを消す */
export function discardSave(keepCorruptCopy: boolean): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (keepCorruptCopy && raw !== null) localStorage.setItem(CORRUPT_KEY, raw);
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 保存領域が使えない環境 */
  }
}
