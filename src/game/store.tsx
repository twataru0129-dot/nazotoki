import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { audio } from './audio';
import { loadSave, writeSave, type LoadResult } from './save';
import { loadSettings, saveSettings } from './settings';
import { initialState, reducer, type Action, type GameState } from './state';
import { useFxSounds } from './useFxSounds';

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  /** 保存データの状態（タイトルの「つづきから」・破損時の選択肢に使う） */
  saveInfo: LoadResult;
  refreshSaveInfo: () => void;
  /** 直近のオートセーブが失敗したか */
  saveFailed: boolean;
}

const GameCtx = createContext<Ctx | null>(null);

/** 時間だけが変わったときの保存間隔（多発する保存を間引く） */
const TIME_SAVE_INTERVAL_MS = 10_000;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(loadSettings()));
  const [saveInfo, setSaveInfo] = useState<LoadResult>(() => loadSave());
  const [saveFailed, setSaveFailed] = useState(false);
  const refreshSaveInfo = useCallback(() => setSaveInfo(loadSave()), []);

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

  // 実プレイ時間：探索中かつ画面が表示されている間だけ1秒ずつ数える（タブ非表示・端末ロック中は数えない）
  const playing = state.screen === 'explore' || state.screen === 'ending';
  const saving = playing || state.screen === 'clear';
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') dispatch({ type: 'tick' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  // オートセーブ：意味のある変化（進行・向き・拡大画面）はすぐ保存。時間だけの変化は10秒おき。
  // 演出は fx（保存しない）で再生するため、演出の途中のフレームは保存されない。
  const latest = useRef(state);
  latest.current = state;
  const lastSig = useRef('');
  const lastAt = useRef(0);
  const save = useCallback((force: boolean) => {
    const s = latest.current;
    if (s.screen !== 'explore' && s.screen !== 'ending' && s.screen !== 'clear') return;
    // 時間（毎秒変わる）を除いた部分で「意味のある変化」かを判定する
    const { playSeconds: _p, afterClearSeconds: _a, ...rest } = s.progress;
    const sig = JSON.stringify([s.facing, s.closeup, rest]);
    const now = Date.now();
    if (!force && sig === lastSig.current && now - lastAt.current < TIME_SAVE_INTERVAL_MS) return;
    lastSig.current = sig;
    lastAt.current = now;
    const ok = writeSave({ facing: s.facing, closeup: s.closeup, progress: s.progress });
    setSaveFailed(!ok);
  }, []);
  useEffect(() => {
    if (saving) save(false);
  }, [saving, state.facing, state.closeup, state.progress, save]);
  // タブを隠す・ページを閉じる直前にも保存
  useEffect(() => {
    const flush = () => save(true);
    const onVis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [save]);
  // タイトルに戻ったら保存状態を読み直す
  useEffect(() => {
    if (state.screen === 'title') refreshSaveInfo();
  }, [state.screen, refreshSaveInfo]);

  // 画面に応じた BGM・環境音（音声の有効化はユーザー操作時に audio.unlock() で行う）
  useEffect(() => {
    // 洋館のきしみは探索中だけ、不規則に鳴らす
    audio.setOldHouse(state.screen === 'explore');
    if (state.screen === 'explore') {
      audio.setBgm('study');
      audio.setAmbient('rain_loop', state.closeup === 'window' ? 1.6 : 1);
    } else if (state.screen === 'ending' || state.screen === 'clear') {
      // 扉の演出・エンディングの音は EndingScreen 側で制御する。クリア画面は静かに
      if (state.screen === 'clear') {
        audio.setBgm(null, 1.5);
        audio.setAmbient(null);
      }
    } else {
      audio.setBgm('title');
      audio.setAmbient(null);
    }
  }, [state.screen, state.closeup]);

  useFxSounds(state.fx);

  return <GameCtx.Provider value={{ state, dispatch, saveInfo, refreshSaveInfo, saveFailed }}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const v = useContext(GameCtx);
  if (!v) throw new Error('GameProvider がありません');
  return v;
}
