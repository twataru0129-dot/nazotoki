import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { audio } from './audio';
import { loadSave, writeSave, type LoadResult } from './save';
import { loadSettings, saveSettings } from './settings';
import { initialState, reducer, type Action, type GameState } from './state';
import { useFxSounds } from './useFxSounds';

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  /** 起動時に読み込んだセーブの状態（タイトルの「つづきから」などに使う） */
  saveStatus: LoadResult['status'];
  refreshSaveStatus: () => void;
  /** 直近のオートセーブが失敗したか */
  saveFailed: boolean;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(loadSettings()));
  const [saveStatus, setSaveStatus] = useState<LoadResult['status']>(() => loadSave().status);
  const [saveFailed, setSaveFailed] = useState(false);
  const refreshSaveStatus = () => setSaveStatus(loadSave().status);

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

  // オートセーブ：探索中の進行・向き・開いている拡大画面が変わるたびに、一貫した状態をまるごと保存する。
  // 演出は fx（セーブしない）で再生するため、演出の途中のフレームは保存されない。
  const playing = state.screen === 'explore' || state.screen === 'ending';
  const lastSaved = useRef<string>('');
  useEffect(() => {
    if (!playing) return;
    const data = { facing: state.facing, closeup: state.closeup, progress: state.progress };
    const sig = JSON.stringify(data);
    if (sig === lastSaved.current) return;
    lastSaved.current = sig;
    const ok = writeSave(data);
    setSaveFailed(!ok);
    if (ok) setSaveStatus('ok');
  }, [playing, state.facing, state.closeup, state.progress]);

  // 画面に応じた BGM・環境音（音声の有効化はユーザー操作時に audio.unlock() で行う）
  useEffect(() => {
    if (state.screen === 'explore') {
      audio.setBgm('study');
      audio.setAmbient('rain_loop', state.closeup === 'window' ? 1.6 : 1);
    } else if (state.screen === 'ending') {
      audio.setBgm(null);
      audio.setAmbient(null);
    } else {
      audio.setBgm('title');
      audio.setAmbient(null);
    }
  }, [state.screen, state.closeup]);

  useFxSounds(state.fx);

  return (
    <GameCtx.Provider value={{ state, dispatch, saveStatus, refreshSaveStatus, saveFailed }}>{children}</GameCtx.Provider>
  );
}

export function useGame() {
  const v = useContext(GameCtx);
  if (!v) throw new Error('GameProvider がありません');
  return v;
}
