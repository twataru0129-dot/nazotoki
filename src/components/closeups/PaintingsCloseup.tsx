import { assetUrl } from '../../game/assets';
import type { PaintingId } from '../../game/logic';
import { cardRevealed } from '../../game/state';
import { useGame } from '../../game/store';
import { CardFront } from '../art/CardFace';
import { Examine } from '../Examine';

// 判定用表示は paintings/painting_*.svg を正とする（生成画像の陰影は使わない）
export function PaintingsCloseup() {
  const { state, dispatch } = useGame();
  const { solved, frameOpen } = state.progress.paintings;
  const wrong = state.fx?.key.startsWith('painting-wrong-') ? state.fx.key.slice(-1) : null;
  const animate = state.fx?.key === 'painting-solved';

  return (
    <>
      <div className="paintings-grid">
        {(['A', 'B', 'C', 'D'] as PaintingId[]).map((k) => {
          const open = k === 'C' && frameOpen;
          return (
            <figure key={k} className={`painting-slot${open ? ' is-open' : ''}`}>
              {open && (
                <div className="painting-behind">
                  {/* 任意調査O3：額縁の裏の新しい傷 */}
                  <Examine id="O3" label="額の裏の傷を調べる" className="scratch-spot">
                    <span className="scratch" aria-hidden="true" />
                  </Examine>
                  {cardRevealed(state.progress, 'B') ? (
                    <button type="button" className="card-pick" onClick={() => dispatch({ type: 'takeCard', id: 'B' })} aria-label="記録カードBを取る">
                      <CardFront id="B" compact />
                      <span className="pick-label">取る</span>
                    </button>
                  ) : (
                    <span className="behind-empty">カードを取った後の額の裏。</span>
                  )}
                </div>
              )}
              <button
                type="button"
                className={`painting-frame${open ? ' is-tilted' : ''}${open && animate ? ' animate-tilt' : ''}${wrong === k ? ' shake' : ''}`}
                key={wrong === k ? `w${state.fx?.n}` : k}
                onClick={() => dispatch({ type: 'choosePainting', id: k })}
                disabled={solved && k === 'C'}
                aria-label={`絵画${k}を調べる`}
                data-painting={k}
              >
                <img src={assetUrl(`svg/paintings/painting_${k}.svg`)} alt="" draggable={false} />
              </button>
              <figcaption aria-hidden="true">{k}</figcaption>
            </figure>
          );
        })}
      </div>
      {!solved && <p className="op-help">おかしいと思う絵をタップする。間違えても何も失わない。</p>}
    </>
  );
}
