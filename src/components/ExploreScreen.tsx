import { useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio';
import { useGame } from '../game/store';
import { FACING_LABEL } from '../game/types';
import { CloseupView } from './CloseupView';
import { SceneStage } from './SceneStage';
import { SelectionChip } from './SelectionChip';

const HIGHLIGHT_MS = 1500;

export function ExploreScreen() {
  const { state, dispatch } = useGame();
  const [highlight, setHighlight] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // キーボード：左右キーで向きを変える
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.closeup || state.overlay) return;
      if (e.key === 'ArrowLeft') dispatch({ type: 'turn', dir: -1 });
      if (e.key === 'ArrowRight') dispatch({ type: 'turn', dir: 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.closeup, state.overlay, dispatch]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const showSpots = () => {
    setHighlight(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHighlight(false), HIGHLIGHT_MS);
  };

  const menu = (id: 'inventory' | 'notebook' | 'hints' | 'settings') => () => {
    audio.unlock();
    if (id === 'notebook') audio.playSfx('paper_turn', 400);
    dispatch({ type: 'openOverlay', id });
  };

  return (
    <main className="explore" onPointerDown={() => audio.unlock()}>
      {/* 拡大画面を開いている間、背後の探索画面は操作・読み上げの対象外にする */}
      <div className="explore-main" inert={state.closeup ? true : undefined} aria-hidden={state.closeup ? true : undefined}>
      <header className="explore-head">
        <h1 className="place">
          書斎A<span className="place-dir" data-testid="facing-label">{FACING_LABEL[state.facing]}</span>
        </h1>
        <button type="button" className="icon-btn" onClick={showSpots} aria-label="調べられる場所を光らせる">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span>調べる場所</span>
        </button>
      </header>

      <SceneStage highlight={highlight} />

      <nav className="turn-row" aria-label="向きを変える">
        <button type="button" className="turn-btn" onClick={() => dispatch({ type: 'turn', dir: -1 })} aria-label="左を向く">
          <span aria-hidden="true">←</span> 左
        </button>
        <span className="compass" aria-live="polite">
          {FACING_LABEL[state.facing]}を向いている
        </span>
        <button type="button" className="turn-btn" onClick={() => dispatch({ type: 'turn', dir: 1 })} aria-label="右を向く">
          右 <span aria-hidden="true">→</span>
        </button>
      </nav>

      {state.facing === 'south' && state.progress.door.unlocked && (
        <div className="proceed-row">
          <button type="button" className="primary-btn" onClick={() => dispatch({ type: 'proceed' })}>
            先へ進む
          </button>
        </div>
      )}
      <SelectionChip />

      <p className="monologue" aria-live="polite" data-testid="monologue">
        {state.monologue ?? '左右の矢印か横スワイプで向きを変え、気になる物をタップして調べる。'}
      </p>

      <nav className="menu-row" aria-label="メニュー">
        <button type="button" onClick={menu('inventory')}>持ち物</button>
        <button type="button" onClick={menu('notebook')}>手帳</button>
        <button type="button" onClick={menu('hints')}>ヒント</button>
        <button type="button" onClick={menu('settings')}>設定</button>
      </nav>
      </div>

      {state.closeup && <CloseupView id={state.closeup} />}
    </main>
  );
}
