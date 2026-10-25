import { cardRevealed } from '../../game/state';
import { useGame } from '../../game/store';
import { useFreshFx } from '../../game/useFreshFx';
import { CardFront } from '../art/CardFace';

function BoxArt({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="8" y="30" width="104" height="44" rx="4" fill="#5a3b22" stroke="#B99A60" strokeWidth="3" />
      {open ? (
        <rect x="6" y="6" width="108" height="14" rx="4" fill="#6d4729" stroke="#B99A60" strokeWidth="3" transform="rotate(-14 10 24)" />
      ) : (
        <rect x="4" y="18" width="112" height="16" rx="4" fill="#6d4729" stroke="#B99A60" strokeWidth="3" />
      )}
      <rect x="52" y="40" width="16" height="20" rx="3" fill="#B99A60" />
      <circle cx="60" cy="47" r="3" fill="#2b1d12" />
      <rect x="58.5" y="48" width="3" height="7" fill="#2b1d12" />
    </svg>
  );
}

// 机上の小箱：持ち物の鍵を選んでからタップすると開き、中のカードCを取れる（従来の机の画面から分けた）
export function BoxCloseup() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const { key, boxOpen } = p.desk;
  const boxAnim = useFreshFx('box-open', 'desk-box');
  const keySelected = state.selected?.kind === 'key';

  return (
    <>
      <div className={`desk-box${boxOpen ? ' is-open' : ''}${keySelected ? ' is-target' : ''}${boxAnim ? ' animate-box' : ''}`}>
        <button
          type="button"
          className="box-btn"
          onClick={() => dispatch({ type: 'useKeyOnBox' })}
          disabled={boxOpen}
          aria-label={boxOpen ? '木箱（開いている）' : keySelected ? '木箱に鍵を使う' : '木箱（鍵穴がある）'}
          data-testid="desk-box"
        >
          <BoxArt open={boxOpen} />
          <span>{boxOpen ? '木箱（開いた）' : keySelected ? '鍵を使う' : '木箱（鍵穴がある）'}</span>
        </button>
        {boxOpen &&
          (cardRevealed(p, 'C') ? (
            <button type="button" className="card-pick" onClick={() => dispatch({ type: 'takeCard', id: 'C' })} aria-label="記録カードCを取る">
              <CardFront id="C" compact />
              <span className="pick-label">取る</span>
            </button>
          ) : (
            <span className="behind-empty">箱は空だ。</span>
          ))}
      </div>
      {key === 'inventory' && !keySelected && <p className="op-help">鍵を使うときは、下の持ち物から鍵を選んでから木箱をタップする。</p>}
    </>
  );
}
