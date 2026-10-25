import { BOOK_INITIAL, CARD_IDS, isBookOrderSolved, isClockSolved, isDoorSolved, type BookId, type CardId } from './logic';
import { OPTIONAL_IDS, optionalAvailable } from './optional';
import { doorSlots, type Progress } from './state';
import { FACINGS, type CloseupId, type Facing } from './types';

// 第1章の進行を端末に自動保存する。
// - 章ごとに別キー。第1章の「はじめから」で他の章のデータを消さない。
// - 上書きの直前に、ひとつ前の保存を予備（PREV_KEY）へ写す。本体が壊れていたら予備から再開できる。
// - 読み込み時に版を確認し、古い版は移行（migrate）してから不変条件を検査する。
export const SAVE_KEY = 'study0017.ch1.save';
export const PREV_KEY = 'study0017.ch1.save.prev';
export const CORRUPT_KEY = 'study0017.ch1.save.corrupt';
export const SAVE_VERSION = 4;

export interface SaveData {
  saveVersion: number;
  chapter: 1;
  savedAt: string;
  facing: Facing;
  closeup: CloseupId | null;
  progress: Progress;
}

const CLOSEUPS: CloseupId[] = ['bookshelf', 'paintings', 'desk', 'box', 'photo', 'clock', 'door', 'window'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** 旧い版のデータを現在の版へ移行する。読めない版なら null */
export function migrate(raw: unknown): unknown {
  if (!isObj(raw)) return null;
  if (raw.saveVersion === SAVE_VERSION) return raw;
  if (raw.saveVersion === 3 && isObj(raw.progress)) {
    // v3 → v4：ヒント機能の廃止。ヒントの開示段階（hintLevels）は捨てる（中身が壊れていても読み込みを止めない）
    const { hintLevels: _dropped, ...progress } = raw.progress;
    void _dropped;
    return { ...raw, saveVersion: 4, progress };
  }
  if (raw.saveVersion === 2 && isObj(raw.progress)) {
    // v2 → v3：エンディング・章クリア・再調査の状態を追加（v2 ではエンディング未実装のため「未再生」）
    return migrate({
      ...raw,
      saveVersion: 3,
      progress: { ...raw.progress, ending: 'none', chapterCompleted: false, clearedAt: null, revisiting: false },
    });
  }
  if (raw.saveVersion === 1 && isObj(raw.progress)) {
    // v1 → v2：時間の記録と取得順を追加。取得順は分からないため A→D の順、時間は 0 から数え直す
    const p = raw.progress;
    const cards = isObj(p.cards) ? p.cards : {};
    const acquired = CARD_IDS.filter((id) => isObj(cards[id]) && (cards[id] as Record<string, unknown>).at !== 'unfound');
    // v1 では一度きりのイベントがなかったため、既に条件を満たしていれば「発生済み」とする（再開後に突然鳴らさない）
    const eventsSeen = [...(acquired.length >= 2 ? ['knock'] : []), ...(acquired.length === 4 ? ['silence'] : [])];
    return migrate({
      ...raw,
      saveVersion: 2,
      progress: { ...p, acquired, eventsSeen, playSeconds: 0, clearSeconds: null, afterClearSeconds: 0 },
    });
  }
  return null;
}

/** 形式と不変条件を検査する。1つでも矛盾があれば null（カードの消失・複製を含むデータは読み込まない） */
export function validateSave(input: unknown): SaveData | null {
  const raw = migrate(input);
  if (!isObj(raw) || raw.saveVersion !== SAVE_VERSION || raw.chapter !== 1) return null;
  if (!FACINGS.includes(raw.facing as Facing)) return null;
  if (raw.closeup !== null && !CLOSEUPS.includes(raw.closeup as CloseupId)) return null;
  const p = raw.progress;
  if (!isObj(p)) return null;
  const { books, paintings, desk, clock, door, cards, optionalNotes, eventsSeen } = p;
  if (!isObj(books) || !isObj(paintings) || !isObj(desk) || !isObj(clock) || !isObj(door) || !isObj(cards)) return null;

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
  // 任意調査・イベント
  if (!Array.isArray(optionalNotes) || !Array.isArray(eventsSeen)) return null;
  if (new Set(optionalNotes).size !== optionalNotes.length) return null;
  if (!optionalNotes.every((o) => OPTIONAL_IDS.includes(o) && optionalAvailable(prog, o))) return null;
  if (new Set(eventsSeen).size !== eventsSeen.length || !eventsSeen.every((e) => e === 'knock' || e === 'silence')) return null;
  const held = CARD_IDS.filter((id) => prog.cards[id].at !== 'unfound').length;
  if (eventsSeen.includes('knock') !== held >= 2 || eventsSeen.includes('silence') !== (held === 4)) return null;
  // 取得順：持っているカードがちょうど1回ずつ
  const { acquired, playSeconds, clearSeconds, afterClearSeconds } = p;
  if (!Array.isArray(acquired) || acquired.length !== held || new Set(acquired).size !== held) return null;
  if (!acquired.every((id) => CARD_IDS.includes(id as CardId) && prog.cards[id as CardId].at !== 'unfound')) return null;
  // 時間
  if (!isInt(playSeconds, 0, 1e9) || !isInt(afterClearSeconds, 0, 1e9)) return null;
  if (clearSeconds !== null && (!isInt(clearSeconds, 0, 1e9) || !door.unlocked || clearSeconds > playSeconds)) return null;
  if (!door.unlocked && (clearSeconds !== null || afterClearSeconds !== 0)) return null;
  // エンディング・章クリア・再調査：解錠前には始まらない。章クリア ⇔ エンディング完了。再調査はクリア後だけ
  const { ending, chapterCompleted, clearedAt, revisiting } = p;
  if (!['none', 'playing', 'done'].includes(ending as string) || !isBool(chapterCompleted) || !isBool(revisiting)) return null;
  if (ending !== 'none' && !door.unlocked) return null;
  if (chapterCompleted !== (ending === 'done')) return null;
  if (revisiting && !chapterCompleted) return null;
  if (chapterCompleted ? typeof clearedAt !== 'string' : clearedAt !== null) return null;
  return raw as unknown as SaveData;
}

export type LoadResult =
  | { status: 'none' }
  | { status: 'ok'; data: SaveData; migrated: boolean }
  /** 本体が壊れている。backup は予備から読めた場合のデータ */
  | { status: 'corrupt'; backup: SaveData | null; raw: string }
  | { status: 'unavailable' };

function parse(raw: string | null): SaveData | null {
  if (raw === null) return null;
  try {
    return validateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadSave(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'none' };
  const data = parse(raw);
  if (data) {
    let migrated = false;
    try {
      migrated = JSON.parse(raw).saveVersion !== SAVE_VERSION;
    } catch {
      /* parse 済み */
    }
    return { status: 'ok', data, migrated };
  }
  let backup: SaveData | null = null;
  try {
    backup = parse(localStorage.getItem(PREV_KEY));
  } catch {
    backup = null;
  }
  return { status: 'corrupt', backup, raw };
}

/** 保存できたら true。失敗してもゲームは続けられる */
export function writeSave(data: Omit<SaveData, 'saveVersion' | 'chapter' | 'savedAt'>): boolean {
  try {
    const full: SaveData = { saveVersion: SAVE_VERSION, chapter: 1, savedAt: new Date().toISOString(), ...data };
    const cur = localStorage.getItem(SAVE_KEY);
    // ひとつ前の保存を予備に残す（本体が読める場合だけ。壊れたデータで予備を上書きしない）
    if (cur !== null && parse(cur)) localStorage.setItem(PREV_KEY, cur);
    localStorage.setItem(SAVE_KEY, JSON.stringify(full));
    return true;
  } catch {
    return false;
  }
}

/** 壊れたデータは消さずに退避してから、第1章の保存（本体・予備）だけを消す */
export function discardSave(keepCorruptCopy: boolean): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (keepCorruptCopy && raw !== null) localStorage.setItem(CORRUPT_KEY, raw);
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(PREV_KEY);
  } catch {
    /* 保存領域が使えない環境 */
  }
}

/** 予備の保存を本体に戻す（壊れた本体は退避） */
export function restoreBackup(): SaveData | null {
  try {
    const prev = localStorage.getItem(PREV_KEY);
    const data = parse(prev);
    if (!data || prev === null) return null;
    const cur = localStorage.getItem(SAVE_KEY);
    if (cur !== null && !parse(cur)) localStorage.setItem(CORRUPT_KEY, cur);
    localStorage.setItem(SAVE_KEY, prev);
    return data;
  } catch {
    return null;
  }
}

/** 保存データをファイルとして書き出す（壊れたデータの控えを利用者の手元に残す） */
export function exportText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
