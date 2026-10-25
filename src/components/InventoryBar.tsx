import { CARDS, type CardId } from '../game/logic';
import { inventoryCards } from '../game/state';
import { useGame } from '../game/store';
import { CardFront } from './art/CardFace';
import { KeyIcon } from './art/KeyIcon';

/** 拡大画面の下に出す持ち物。タップで選ぶ／もう一度タップで解除。扉ではカードをドラッグもできる */
export function InventoryBar({ dragBind }: { dragBind?: (id: CardId) => Record<string, unknown> }) {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const cards = inventoryCards(p);
  const hasKey = p.desk.key === 'inventory';
  const sel = state.selected;
  if (!hasKey && cards.length === 0) {
    return (
      <div className="inv-bar is-empty" aria-label="持ち物">
        <span>使える持ち物はない</span>
      </div>
    );
  }
  return (
    <div className="inv-bar" aria-label="持ち物" data-drop="inventory">
      <ul>
        {hasKey && (
          <li>
            <button
              type="button"
              className={`inv-item${sel?.kind === 'key' ? ' is-selected' : ''}`}
              aria-pressed={sel?.kind === 'key'}
              onClick={() => dispatch({ type: 'select', item: sel?.kind === 'key' ? null : { kind: 'key' } })}
            >
              <KeyIcon />
              <span className="inv-name">小さな鍵</span>
            </button>
          </li>
        )}
        {cards.map((id) => {
          const on = sel?.kind === 'card' && sel.id === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={`inv-item inv-card${on ? ' is-selected' : ''}`}
                aria-pressed={on}
                aria-label={`記録カード${id}（${CARDS[id].time} ${CARDS[id].symbol}）`}
                data-card={id}
                onClick={() => dispatch({ type: 'select', item: on ? null : { kind: 'card', id } })}
                {...(dragBind ? dragBind(id) : {})}
              >
                <CardFront id={id} compact />
              </button>
            </li>
          );
        })}
      </ul>
      {sel && (
        <button type="button" className="ghost-btn small" onClick={() => dispatch({ type: 'select', item: null })}>
          選択をやめる
        </button>
      )}
    </div>
  );
}
