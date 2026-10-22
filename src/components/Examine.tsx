import type { ReactNode } from 'react';
import type { OptionalId } from '../game/state';
import { useGame } from '../game/store';

/** 任意調査の調べられる部分。探索補助では光らせない（伏線のネタバレを避ける）。最小44pxのタップ領域 */
export function Examine({ id, label, className, children }: { id: OptionalId; label: string; className?: string; children: ReactNode }) {
  const { state, dispatch } = useGame();
  const found = state.progress.optionalNotes.includes(id);
  return (
    <button
      type="button"
      className={`examine${found ? ' is-found' : ''}${className ? ` ${className}` : ''}`}
      data-optional={id}
      aria-label={label}
      onClick={() => dispatch({ type: 'discover', id })}
    >
      {children}
    </button>
  );
}
