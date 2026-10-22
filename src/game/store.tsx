import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { audio } from './audio';
import { loadSettings, saveSettings } from './settings';
import { initialState, reducer, type Action, type GameState } from './state';

const Ctx = createContext<{ state: GameState; dispatch: Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(loadSettings()));

  // 設定：保存・音量反映・動きの軽減
  useEffect(() => {
    saveSettings(state.settings);
    audio.applySettings(state.settings);
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const reduce = state.settings.reducedMotion === 'on' || (state.settings.reducedMotion === 'system' && !!mq?.matches);
      document.documentElement.dataset.reducedMotion = reduce ? 'true' : 'false';
    };
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [state.settings]);

  // 画面に応じた BGM・環境音（音声の有効化はユーザー操作時に audio.unlock() で行う）
  useEffect(() => {
    if (state.screen === 'explore') {
      audio.setBgm('study');
      audio.setAmbient('rain_loop', state.closeup === 'window' ? 1.6 : 1);
    } else {
      audio.setBgm('title');
      audio.setAmbient(null);
    }
  }, [state.screen, state.closeup]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('GameProvider がありません');
  return v;
}
