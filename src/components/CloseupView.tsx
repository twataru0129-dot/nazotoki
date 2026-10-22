import { useEffect, useRef, type ComponentType } from 'react';
import { useGame } from '../game/store';
import { CLOSEUP_TEXT } from '../game/text';
import type { CloseupId } from '../game/types';
import { BookshelfCloseup } from './closeups/BookshelfCloseup';
import { ClockCloseup } from './closeups/ClockCloseup';
import { DeskCloseup } from './closeups/DeskCloseup';
import { DoorCloseup } from './closeups/DoorCloseup';
import { PaintingsCloseup } from './closeups/PaintingsCloseup';
import { WindowCloseup } from './closeups/WindowCloseup';

const BODY: Record<CloseupId, ComponentType> = {
  bookshelf: BookshelfCloseup,
  paintings: PaintingsCloseup,
  desk: DeskCloseup,
  clock: ClockCloseup,
  door: DoorCloseup,
  window: WindowCloseup,
};

export function CloseupView({ id }: { id: CloseupId }) {
  const { state, dispatch } = useGame();
  const Body = BODY[id];
  const text = CLOSEUP_TEXT[id];
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    back.current?.focus();
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !state.overlay) dispatch({ type: 'closeCloseup' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.overlay]);

  return (
    <section className="closeup" role="region" aria-label={`${text.title}を調べる`} data-testid={`closeup-${id}`}>
      <header className="closeup-head">
        <button ref={back} type="button" className="back-btn" onClick={() => dispatch({ type: 'closeCloseup' })}>
          <span aria-hidden="true">←</span> 戻る
        </button>
        <h2>{text.title}</h2>
        <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'openOverlay', id: 'hints' })}>
          ヒント
        </button>
      </header>
      <div className="closeup-body">
        <Body />
        {text.inscription && <p className="inscription">「{text.inscription}」</p>}
        {text.description && <p className="description">{text.description}</p>}
      </div>
    </section>
  );
}
