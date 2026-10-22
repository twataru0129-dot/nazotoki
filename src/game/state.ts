import { turn } from './geometry';
import {
  BOOK_INITIAL,
  CARD_IDS,
  CLOCK_STOPPED,
  drawerWithKey,
  isBookOrderSolved,
  isClockSolved,
  isDoorSolved,
  isPaintingCorrect,
  normalizeClock,
  normalizeDial,
  swapBooks,
  type BookId,
  type CardId,
  type DrawerId,
  type PaintingId,
} from './logic';
import { OPTIONALS, optionalAvailable } from './optional';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { FACINGS, PUZZLES, type CloseupId, type Facing, type OverlayId, type PuzzleId, type Screen } from './types';

// ---------- 進行データ（オートセーブの対象） ----------

/** カードは常に「未取得／持ち物／扉の枠」のどれか1か所にだけ存在する（消失・複製しない） */
export type CardLocation = { at: 'unfound' } | { at: 'inventory' } | { at: 'slot'; index: number };
export type KeyState = 'unfound' | 'inventory' | 'used';
/** 任意調査（第3段階で発見・記録を実装する） */
export type OptionalId = 'O1' | 'O2' | 'O3' | 'O4' | 'O5' | 'O6';

export interface Progress {
  books: { order: BookId[]; solved: boolean; compartmentOpen: boolean };
  paintings: { solved: boolean; frameOpen: boolean };
  desk: { rightOpen: boolean; key: KeyState; boxOpen: boolean };
  /** minutes は時計の表示時刻（0時からの分）。解決フラグとは別に管理する */
  clock: { minutes: number; solved: boolean; compartmentOpen: boolean; handsReturned: boolean };
  /** カードの配置は cards 側だけで持つ（枠の中身は doorSlots() で導出） */
  door: { dialMinute: number; unlocked: boolean };
  cards: Record<CardId, CardLocation>;
  hintLevels: Record<PuzzleId, 0 | 1 | 2 | 3>;
  /** 発見した任意調査（発見順） */
  optionalNotes: OptionalId[];
  /** 一度きりのイベント（'knock' = 2枚目の物音、'silence' = 4枚目の静寂） */
  eventsSeen: EventId[];
  /** カードを手に入れた順（手帳の「取得順」表示用） */
  acquired: CardId[];
  /** 画面が表示されている間の実プレイ時間（秒）。扉の解錠まで */
  playSeconds: number;
  /** 扉を解錠した瞬間のプレイ時間で固定。以後変わらない（旧データから移行した場合は null のこともある） */
  clearSeconds: number | null;
  /** 解錠後の再調査の時間（別カウンター） */
  afterClearSeconds: number;
}

export type EventId = 'knock' | 'silence';

export function initialProgress(): Progress {
  return {
    books: { order: [...BOOK_INITIAL], solved: false, compartmentOpen: false },
    paintings: { solved: false, frameOpen: false },
    desk: { rightOpen: false, key: 'unfound', boxOpen: false },
    clock: { minutes: CLOCK_STOPPED, solved: false, compartmentOpen: false, handsReturned: false },
    door: { dialMinute: CLOCK_STOPPED, unlocked: false },
    cards: { A: { at: 'unfound' }, B: { at: 'unfound' }, C: { at: 'unfound' }, D: { at: 'unfound' } },
    hintLevels: Object.fromEntries(PUZZLES.map((p) => [p, 0])) as Progress['hintLevels'],
    optionalNotes: [],
    eventsSeen: [],
    acquired: [],
    playSeconds: 0,
    clearSeconds: null,
    afterClearSeconds: 0,
  };
}

// ---------- 導出値 ----------

/** カードが出てくる収納が開いているか */
export function containerOpen(p: Progress, id: CardId): boolean {
  switch (id) {
    case 'A':
      return p.books.compartmentOpen;
    case 'B':
      return p.paintings.frameOpen;
    case 'C':
      return p.desk.boxOpen;
    case 'D':
      return p.clock.compartmentOpen;
  }
}

/** 収納が開いていて、まだ取っていない（現地に出現中） */
export function cardRevealed(p: Progress, id: CardId): boolean {
  return containerOpen(p, id) && p.cards[id].at === 'unfound';
}

export function cardHeld(p: Progress, id: CardId): boolean {
  return p.cards[id].at !== 'unfound';
}

export function doorSlots(p: Progress): (CardId | null)[] {
  const slots: (CardId | null)[] = [null, null, null, null];
  for (const id of CARD_IDS) {
    const loc = p.cards[id];
    if (loc.at === 'slot') slots[loc.index] = id;
  }
  return slots;
}

export function inventoryCards(p: Progress): CardId[] {
  return CARD_IDS.filter((id) => p.cards[id].at === 'inventory');
}

export function heldCount(p: Progress): number {
  return CARD_IDS.filter((id) => cardHeld(p, id)).length;
}

// ---------- 画面状態（セーブしない部分を含む） ----------

export type Selection = { kind: 'card'; id: CardId } | { kind: 'key' } | null;

export interface GameState {
  screen: Screen;
  facing: Facing;
  closeup: CloseupId | null;
  /** 探索画面に重ねる画面は常に1つだけ。閉じると下の拡大画面に戻る */
  overlay: OverlayId | null;
  monologue: string | null;
  /** 回転アニメーションの向き（-1 左 / 1 右）。再生ごとに n を変える */
  lastTurn: { dir: -1 | 1; n: number } | null;
  /** 持ち物から選んでいる物（セーブしない。向きを変えても保持、いつでも解除できる） */
  selected: Selection;
  /** 直前に起きた出来事。成功演出・効果音はこれが変わったときだけ再生する（再訪問・再読み込みで繰り返さない） */
  fx: { key: string; n: number } | null;
  /** 手帳からオープニングを見返している（終わったら元の探索へ戻る。進行は変えない） */
  openingReplay: boolean;
  progress: Progress;
  settings: Settings;
}

export type Action =
  | { type: 'newGame' }
  | { type: 'continueGame'; progress: Progress; facing: Facing; closeup: CloseupId | null }
  | { type: 'enterStudy' }
  | { type: 'toTitle' }
  | { type: 'turn'; dir: -1 | 1 }
  | { type: 'openCloseup'; id: CloseupId }
  | { type: 'closeCloseup' }
  | { type: 'openOverlay'; id: OverlayId }
  | { type: 'closeOverlay' }
  | { type: 'say'; text: string }
  | { type: 'clearSay' }
  | { type: 'revealHint'; puzzle: PuzzleId }
  | { type: 'setSettings'; settings: Settings }
  | { type: 'select'; item: Selection }
  // 謎の操作
  | { type: 'swapBooks'; i: number; j: number }
  | { type: 'choosePainting'; id: PaintingId }
  | { type: 'openDrawer'; id: DrawerId }
  | { type: 'takeKey' }
  | { type: 'useKeyOnBox' }
  | { type: 'adjustClock'; delta: number }
  | { type: 'setClock'; minutes: number }
  | { type: 'takeCard'; id: CardId }
  | { type: 'placeCard'; id: CardId; slot: number }
  | { type: 'removeCard'; slot: number }
  | { type: 'adjustDial'; delta: number }
  | { type: 'proceed' }
  | { type: 'backToStudy' }
  // 任意調査・時間・オープニングの見返し
  | { type: 'discover'; id: OptionalId }
  | { type: 'tick' }
  | { type: 'replayOpening' };

export function initialState(settings: Settings = DEFAULT_SETTINGS): GameState {
  return {
    screen: 'title',
    facing: 'north',
    closeup: null,
    overlay: null,
    monologue: null,
    lastTurn: null,
    selected: null,
    fx: null,
    openingReplay: false,
    progress: initialProgress(),
    settings,
  };
}

const fx = (s: GameState, key: string) => ({ key, n: (s.fx?.n ?? 0) + 1 });

function withProgress(s: GameState, progress: Progress, fxKey?: string, monologue?: string | null): GameState {
  return {
    ...s,
    progress,
    fx: fxKey ? fx(s, fxKey) : s.fx,
    monologue: monologue === undefined ? s.monologue : monologue,
  };
}

const MSG = {
  booksSolved: '金属の外れる音がして、棚の下の隠し収納が開いた。中に一枚のカードがある。',
  paintingWrong: '額を押してみたが、びくともしない。',
  paintingSolved: '額がきしみ、わずかに傾いた。裏に一枚のカードが挟まっている。',
  drawerLocked: '引き出しは開かない。',
  drawerOpen: '右の引き出しが開いた。小さな古い鍵が入っている。',
  keyTaken: '小さな鍵を手に入れた。',
  boxLocked: '木箱には鍵がかかっている。',
  boxNeedSelect: '小さな鍵が合いそうだ。持ち物から鍵を選んで、もう一度木箱に触れよう。',
  boxOpen: '鍵を回すと、木箱のふたが開いた。中にカードがある。鍵は鍵穴に残った。',
  clockSolved: '歯車の噛み合う音がして、時計の下の収納が開いた。',
  clockReturned: '針がひとりでに動き、0時17分へ戻った……。',
  cardTaken: (id: CardId) => `記録カード${id}を手に入れた。`,
  knock: '……壁の向こうで、小さく「コトッ」と音がした。',
  silence: '……ふいに、雨の音が遠のいた。4枚の記録がそろった。南の扉が、静かにこちらを待っている。',
  doorWrong: '4枚を差し込んだが、装置は動かない。',
  doorSolved: 'カードが一斉に裏返り、線がつながった。重い錠の外れる音がした。',
};

export function reducer(state: GameState, action: Action): GameState {
  const p = state.progress;
  switch (action.type) {
    case 'newGame':
      return { ...initialState(state.settings), screen: 'opening' };
    case 'continueGame':
      return {
        ...initialState(state.settings),
        screen: 'explore',
        progress: action.progress,
        facing: action.facing,
        closeup: action.closeup,
      };
    case 'enterStudy':
      // 見返しの場合は、元の向きのまま探索に戻る
      if (state.openingReplay) return { ...state, screen: 'explore', openingReplay: false, closeup: null, overlay: null, monologue: null };
      return { ...state, screen: 'explore', facing: 'north', closeup: null, overlay: null, monologue: null };
    case 'replayOpening':
      if (state.screen !== 'explore') return state;
      return { ...state, screen: 'opening', openingReplay: true, overlay: null, closeup: null, selected: null };
    case 'toTitle':
      return { ...state, screen: 'title', closeup: null, overlay: null, monologue: null, selected: null };
    case 'turn': {
      if (state.closeup || state.overlay) return state;
      const i = turn(FACINGS.indexOf(state.facing), action.dir);
      return { ...state, facing: FACINGS[i], monologue: null, lastTurn: { dir: action.dir, n: (state.lastTurn?.n ?? 0) + 1 } };
    }
    case 'openCloseup':
      return { ...state, closeup: action.id, overlay: null, monologue: null };
    case 'closeCloseup':
      return { ...state, closeup: null, monologue: null };
    case 'openOverlay':
      return { ...state, overlay: action.id };
    case 'closeOverlay':
      return { ...state, overlay: null };
    case 'say':
      return { ...state, monologue: action.text };
    case 'clearSay':
      return { ...state, monologue: null };
    case 'revealHint': {
      const cur = p.hintLevels[action.puzzle];
      if (cur >= 3) return state;
      return withProgress(state, { ...p, hintLevels: { ...p.hintLevels, [action.puzzle]: (cur + 1) as 1 | 2 | 3 } });
    }
    case 'setSettings':
      return { ...state, settings: action.settings };
    case 'select': {
      const it = action.item;
      // 持っていない物は選べない
      if (it?.kind === 'key' && p.desk.key !== 'inventory') return state;
      if (it?.kind === 'card' && p.cards[it.id].at === 'unfound') return state;
      return { ...state, selected: it };
    }

    // ---------- 本棚 ----------
    case 'swapBooks': {
      if (p.books.solved) return state;
      const { i, j } = action;
      if (i === j || i < 0 || j < 0 || i > 3 || j > 3) return state;
      const order = swapBooks(p.books.order, i, j);
      const solved = isBookOrderSolved(order);
      const books = { order, solved, compartmentOpen: solved };
      return withProgress(state, { ...p, books }, solved ? 'books-solved' : 'books-move', solved ? MSG.booksSolved : null);
    }

    // ---------- 絵画 ----------
    case 'choosePainting': {
      if (p.paintings.solved) return state;
      if (!isPaintingCorrect(action.id)) return { ...state, fx: fx(state, `painting-wrong-${action.id}`), monologue: MSG.paintingWrong };
      return withProgress(state, { ...p, paintings: { solved: true, frameOpen: true } }, 'painting-solved', MSG.paintingSolved);
    }

    // ---------- 机 ----------
    case 'openDrawer': {
      if (action.id !== drawerWithKey()) return { ...state, fx: fx(state, `drawer-locked-${action.id}`), monologue: MSG.drawerLocked };
      if (p.desk.rightOpen) return state;
      return withProgress(state, { ...p, desk: { ...p.desk, rightOpen: true } }, 'drawer-open', MSG.drawerOpen);
    }
    case 'takeKey': {
      if (!p.desk.rightOpen || p.desk.key !== 'unfound') return state;
      return withProgress(state, { ...p, desk: { ...p.desk, key: 'inventory' } }, 'key-take', MSG.keyTaken);
    }
    case 'useKeyOnBox': {
      if (p.desk.boxOpen) return state;
      if (p.desk.key !== 'inventory') return { ...state, monologue: MSG.boxLocked };
      if (state.selected?.kind !== 'key') return { ...state, monologue: MSG.boxNeedSelect };
      return {
        ...withProgress(state, { ...p, desk: { ...p.desk, key: 'used', boxOpen: true } }, 'box-open', MSG.boxOpen),
        selected: null,
      };
    }

    // ---------- 時計 ----------
    case 'adjustClock':
    case 'setClock': {
      if (p.clock.solved) return state;
      const minutes = normalizeClock(action.type === 'setClock' ? action.minutes : p.clock.minutes + action.delta);
      if (minutes === p.clock.minutes) return state;
      const solved = isClockSolved(minutes);
      const clock = { ...p.clock, minutes, solved, compartmentOpen: solved };
      return withProgress(state, { ...p, clock }, solved ? 'clock-solved' : undefined, solved ? MSG.clockSolved : undefined);
    }

    // ---------- カードの取得 ----------
    case 'takeCard': {
      const id = action.id;
      if (!cardRevealed(p, id)) return state; // 収納が閉じている／すでに取得済み
      let next: Progress = { ...p, cards: { ...p.cards, [id]: { at: 'inventory' } }, acquired: [...p.acquired, id] };
      let msg = MSG.cardTaken(id);
      const keys = [id === 'D' ? 'card-take-D' : 'card-take'];
      if (id === 'D') {
        // カードDを取ると、針はひとりでに 00:17 へ戻る。解決済み・収納の状態は変わらない
        next = { ...next, clock: { ...next.clock, minutes: CLOCK_STOPPED, handsReturned: true } };
        msg = `${msg}　${MSG.clockReturned}`;
      }
      // 一度きりのイベント：2枚目で壁の物音、4枚目で静寂（フラグを保存し、再読み込みで再発火しない）
      const held = heldCount(next);
      if (held >= 2 && !next.eventsSeen.includes('knock')) {
        next = { ...next, eventsSeen: [...next.eventsSeen, 'knock'] };
        msg = `${msg}\n${MSG.knock}`;
        keys.push('knock');
      }
      if (held === 4 && !next.eventsSeen.includes('silence')) {
        next = { ...next, eventsSeen: [...next.eventsSeen, 'silence'] };
        msg = `${msg}\n${MSG.silence}`;
        keys.push('silence');
      }
      return withProgress(state, next, keys.join('|'), msg);
    }

    // ---------- 扉 ----------
    case 'placeCard': {
      if (p.door.unlocked) return state;
      const { id, slot } = action;
      if (slot < 0 || slot > 3) return state;
      const from = p.cards[id];
      if (from.at === 'unfound') return state;
      if (from.at === 'slot' && from.index === slot) return state;
      const occupant = doorSlots(p)[slot];
      const cards = { ...p.cards, [id]: { at: 'slot', index: slot } as CardLocation };
      // 置き先にあったカードは、置いたカードの元の場所へ（持ち物からなら持ち物へ、別の枠からなら入れ替え）
      if (occupant) cards[occupant] = from.at === 'slot' ? { at: 'slot', index: from.index } : { at: 'inventory' };
      return checkDoor({ ...state, selected: null }, { ...p, cards }, 'door-place');
    }
    case 'removeCard': {
      if (p.door.unlocked) return state;
      const id = doorSlots(p)[action.slot];
      if (!id) return state;
      return withProgress(state, { ...p, cards: { ...p.cards, [id]: { at: 'inventory' } } }, 'door-remove', null);
    }
    case 'adjustDial': {
      if (p.door.unlocked) return state;
      const dialMinute = normalizeDial(p.door.dialMinute + action.delta);
      return checkDoor(state, { ...p, door: { ...p.door, dialMinute } }, 'door-dial');
    }
    case 'proceed':
      if (!p.door.unlocked) return state;
      return { ...state, screen: 'ending', closeup: null, overlay: null, selected: null };
    case 'backToStudy':
      return { ...state, screen: 'explore', facing: 'south', closeup: null };

    // ---------- 任意調査 ----------
    case 'discover': {
      const def = OPTIONALS[action.id];
      if (!optionalAvailable(p, action.id)) return state;
      // 発見済みなら独白だけ（再取得の演出はしない）
      if (p.optionalNotes.includes(action.id)) return { ...state, monologue: def.monologue };
      return withProgress(state, { ...p, optionalNotes: [...p.optionalNotes, action.id] }, 'note', `${def.monologue}\n（手帳に「${def.title}」を書き留めた）`);
    }

    // ---------- 時間 ----------
    case 'tick':
      if (state.screen !== 'explore' && state.screen !== 'ending') return state;
      return {
        ...state,
        progress: p.door.unlocked ? { ...p, afterClearSeconds: p.afterClearSeconds + 1 } : { ...p, playSeconds: p.playSeconds + 1 },
      };
  }
}

/** 扉の判定。4枚がそろったのに条件を満たさないときだけ「動かない」と伝える */
function checkDoor(state: GameState, next: Progress, fxKey: string): GameState {
  const slots = doorSlots(next);
  if (isDoorSolved(slots, next.door.dialMinute)) {
    // クリア時間は解錠の瞬間に固定する
    return withProgress(state, { ...next, door: { ...next.door, unlocked: true }, clearSeconds: next.playSeconds }, 'door-solved', MSG.doorSolved);
  }
  const full = slots.every(Boolean);
  return withProgress(state, next, fxKey, full && fxKey === 'door-place' ? MSG.doorWrong : null);
}

