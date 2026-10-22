import { useGame } from '../../game/store';
import { DevNote } from '../DevNote';

// 持ち物：実際に所持している物だけを並べる。記録カードは第2段階で「未発見／現地／持ち物／扉の枠」を管理する。
export function InventoryPanel() {
  const { dispatch } = useGame();
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
      </ul>
      <h3 className="sub-head">記録カード</h3>
      <ul className="card-slots" aria-label="記録カード（まだ持っていない）">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="card-slot is-empty">
            <span>未発見</span>
          </li>
        ))}
      </ul>
      <DevNote>カードや鍵の入手・使用は第2段階で実装します。</DevNote>
    </>
  );
}
