import { DEFAULT_SETTINGS, type Settings } from './settings';
import { FACINGS, PUZZLES, type CloseupId, type Facing, type OverlayId, type PuzzleId, type Screen } from './types';
import { turn } from './geometry';

/** 進行データ。第3段階でオートセーブの対象にする（saveVersion 等はその時に追加） */
export interface Progress {
  hintLevels: Record<PuzzleId, 0 | 1 | 2 | 3>;
}

export interface GameState {
  screen: Screen;
  facing: Facing;
  closeup: CloseupId | null;
  /** 探索画面に重ねる画面は常に1つだけ。閉じると下の拡大画面に戻る */
  overlay: OverlayId | null;
  monologue: string | null;
  /** 回転アニメーションの向き（-1 左 / 1 右）。再生ごとに key を変える */
  lastTurn: { dir: -1 | 1; n: number } | null;
  progress: Progress;
  settings: Settings;
}

export type Action =
  | { type: 'newGame' }
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
  | { type: 'setSettings'; settings: Settings };

export function initialProgress(): Progress {
  return { hintLevels: Object.fromEntries(PUZZLES.map((p) => [p, 0])) as Progress['hintLevels'] };
}

export function initialState(settings: Settings = DEFAULT_SETTINGS): GameState {
  return {
    screen: 'title',
    facing: 'north',
    closeup: null,
    overlay: null,
    monologue: null,
    lastTurn: null,
    progress: initialProgress(),
    settings,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'newGame':
      return { ...initialState(state.settings), screen: 'opening' };
    case 'enterStudy':
      return { ...state, screen: 'explore', facing: 'north', closeup: null, overlay: null, monologue: null };
    case 'toTitle':
      return { ...state, screen: 'title', closeup: null, overlay: null, monologue: null };
    case 'turn': {
      if (state.closeup || state.overlay) return state;
      const i = turn(FACINGS.indexOf(state.facing), action.dir);
      return {
        ...state,
        facing: FACINGS[i],
        monologue: null,
        lastTurn: { dir: action.dir, n: (state.lastTurn?.n ?? 0) + 1 },
      };
    }
    case 'openCloseup':
      return { ...state, closeup: action.id, overlay: null, monologue: null };
    case 'closeCloseup':
      return { ...state, closeup: null };
    case 'openOverlay':
      return { ...state, overlay: action.id };
    case 'closeOverlay':
      return { ...state, overlay: null };
    case 'say':
      return { ...state, monologue: action.text };
    case 'clearSay':
      return { ...state, monologue: null };
    case 'revealHint': {
      const cur = state.progress.hintLevels[action.puzzle];
      if (cur >= 3) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          hintLevels: { ...state.progress.hintLevels, [action.puzzle]: (cur + 1) as 1 | 2 | 3 },
        },
      };
    }
    case 'setSettings':
      return { ...state, settings: action.settings };
  }
}
