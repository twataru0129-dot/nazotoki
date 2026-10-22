import { DRAWERS, type DrawerId } from '../../game/logic';
import { cardRevealed } from '../../game/state';
import { useGame } from '../../game/store';
import { DRAWER_LABELS } from '../../game/text';
import { CardFront } from '../art/CardFace';
import { KeyIcon } from '../art/KeyIcon';
import { OldPhoto } from '../art/OldPhoto';
import { Examine } from '../Examine';

const POS: Record<DrawerId, string> = { left: '左', middle: '中央', right: '右' };

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

export function DeskCloseup() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const { rightOpen, key, boxOpen } = p.desk;
  const shake = state.fx?.key.startsWith('drawer-locked-') ? state.fx.key.slice('drawer-locked-'.length) : null;
  const keySelected = state.selected?.kind === 'key';

  return (
    <>
      <div className="desk">
        <div className={`desk-box${boxOpen ? ' is-open' : ''}${keySelected ? ' is-target' : ''}`}>
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

        <OldPhoto />

        <ol className="drawers" aria-label="3つの引き出し">
          {DRAWERS.map((d) => {
            const open = d === 'right' && rightOpen;
            return (
              <li key={d} className={`drawer${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className={`drawer-front${shake === d ? ' shake' : ''}`}
                  key={shake === d ? `s${state.fx?.n}` : d}
                  onClick={() => dispatch({ type: 'openDrawer', id: d })}
                  aria-label={`${POS[d]}の引き出し「${DRAWER_LABELS[d]}」${open ? '（開いている）' : 'を開ける'}`}
                  data-drawer={d}
                >
                  <span className="drawer-pos">{POS[d]}</span>
                  <span className="drawer-label">「{DRAWER_LABELS[d]}」</span>
                  <span className="drawer-handle" aria-hidden="true" />
                </button>
                {open && (
                  <div className="drawer-inside">
                    {key === 'unfound' ? (
                      <button type="button" className="key-pick" onClick={() => dispatch({ type: 'takeKey' })} aria-label="小さな鍵を取る">
                        <KeyIcon />
                        <span>取る</span>
                      </button>
                    ) : (
                      <span className="behind-empty">{key === 'used' ? '鍵は木箱に使った。' : '鍵は持っている。'}</span>
                    )}
                    {/* 任意調査O4：引き出しの底の「II」の刻印 */}
                    <Examine id="O4" label="引き出しの底を調べる" className="engraving">
                      <span aria-hidden="true">II</span>
                    </Examine>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!rightOpen && <p className="op-help">開けたい引き出しをタップする。開かない引き出しを選んでも何も失わない。</p>}
      {key === 'inventory' && !keySelected && <p className="op-help">鍵を使うときは、下の持ち物から鍵を選んでから木箱をタップする。</p>}
    </>
  );
}
