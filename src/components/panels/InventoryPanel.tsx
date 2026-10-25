import { useState } from 'react';
import { CARD_IDS, CARDS, type CardId } from '../../game/logic';
import { useGame } from '../../game/store';
import { CardFront } from '../art/CardFace';
import { KeyIcon } from '../art/KeyIcon';

// 持ち物：実際に持っている物と、扉の枠に置いたカード（所持先「装置上」）を区別して表示する
export function InventoryPanel() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const [view, setView] = useState<CardId | null>(null);
  const held = CARD_IDS.filter((id) => p.cards[id].at !== 'unfound');

  return (
    <>
      <ul className="item-grid">
        <li>
          <button type="button" className="item" onClick={() => dispatch({ type: 'openOverlay', id: 'letter' })}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <rect x="8" y="6" width="32" height="36" rx="2" fill="#F1E8D7" />
              <path d="M14 15h20M14 21h20M14 27h14" stroke="#7d6a4c" strokeWidth="2" />
            </svg>
            <span>城戸の手紙</span>
          </button>
        </li>
        {p.desk.key === 'inventory' && (
          <li>
            <button
              type="button"
              className={`item${state.selected?.kind === 'key' ? ' is-selected' : ''}`}
              aria-pressed={state.selected?.kind === 'key'}
              onClick={() => dispatch({ type: 'select', item: state.selected?.kind === 'key' ? null : { kind: 'key' } })}
            >
              <KeyIcon />
              <span>小さな鍵{state.selected?.kind === 'key' ? '（選択中）' : ''}</span>
            </button>
          </li>
        )}
        {p.desk.key === 'used' && (
          <li className="item is-used" aria-label="小さな鍵（使用済み）">
            <KeyIcon />
            <span>小さな鍵（使用済み）</span>
          </li>
        )}
      </ul>

      <h3 className="sub-head">記録カード　{held.length} / 4</h3>
      <ul className="card-slots">
        {CARD_IDS.map((id) => {
          const loc = p.cards[id];
          if (loc.at === 'unfound')
            return (
              <li key={id} className="card-slot is-empty">
                <span>未発見</span>
              </li>
            );
          return (
            <li key={id} className="card-slot">
              <button type="button" className="card-view-btn" onClick={() => setView(view === id ? null : id)} aria-label={`記録カード${id}を大きく見る`}>
                <CardFront id={id} compact />
              </button>
              <span className="card-where">{loc.at === 'slot' ? `扉の枠${loc.index + 1}` : '持ち物'}</span>
            </li>
          );
        })}
      </ul>
      {view && (
        <div className="card-large">
          <CardFront id={view} />
          <p className="description small">{`${CARDS[view].source}で見つけた記録。`}</p>
        </div>
      )}
    </>
  );
}
