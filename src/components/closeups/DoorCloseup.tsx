import { useCallback } from 'react';
import { CARDS, type CardId } from '../../game/logic';
import { doorSlots, heldCount } from '../../game/state';
import { useGame } from '../../game/store';
import { formatTime } from '../art/ClockFace';
import { CardBack, CardFront } from '../art/CardFace';
import { InventoryBar } from '../InventoryBar';
import { useDrag } from '../useDrag';

type DragSrc = { from: 'inv'; id: CardId } | { from: 'slot'; id: CardId; slot: number };

// 扉の装置（door_four_slots.svg を基準に、縦長のカード枠を横一列に4つ）。
// スマホでも記号と時刻が読めるよう、操作画面はDOMで組む。
export function DoorCloseup() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const slots = doorSlots(p);
  const { unlocked, dialMinute } = p.door;
  const sel = state.selected;
  const animate = state.fx?.key === 'door-solved';

  const onDrop = useCallback(
    (src: DragSrc, drop: string | null) => {
      if (drop?.startsWith('slot-')) dispatch({ type: 'placeCard', id: src.id, slot: Number(drop.slice(5)) });
      else if (drop === 'inventory' && src.from === 'slot') dispatch({ type: 'removeCard', slot: src.slot });
    },
    [dispatch],
  );
  const { bind, ghost } = useDrag<DragSrc>(onDrop);

  const tapSlot = (i: number) => {
    if (unlocked) return;
    if (sel?.kind === 'card') dispatch({ type: 'placeCard', id: sel.id, slot: i });
    else if (slots[i]) dispatch({ type: 'removeCard', slot: i });
  };

  return (
    <>
      <div className={`door-device-ui${unlocked ? ' is-unlocked' : ''}${animate ? ' animate-solve' : ''}`}>
        <div className="dial" aria-label="時刻ダイヤル">
          <button type="button" className="round-btn" onClick={() => dispatch({ type: 'adjustDial', delta: -1 })} disabled={unlocked} aria-label="ダイヤルを1分戻す">
            −1分
          </button>
          <output className="dial-face" data-testid="dial-readout" aria-live="polite">
            {formatTime(dialMinute)}
          </output>
          <button type="button" className="round-btn" onClick={() => dispatch({ type: 'adjustDial', delta: 1 })} disabled={unlocked} aria-label="ダイヤルを1分進める">
            ＋1分
          </button>
        </div>
        <ol className="door-slots" aria-label="カード枠（左から）">
          {slots.map((id, i) => (
            <li key={i} className="door-slot-cell">
              <button
                type="button"
                className={`door-slot${id ? ' is-filled' : ''}${sel?.kind === 'card' && !unlocked ? ' is-target' : ''}`}
                data-drop={`slot-${i}`}
                data-slot={i}
                aria-label={`${i + 1}番目の枠${id ? `：記録カード${id}（${CARDS[id].time} ${CARDS[id].symbol}）${unlocked ? '' : '。タップで外す'}` : '：空'}`}
                onClick={() => tapSlot(i)}
                disabled={unlocked}
                {...(id && !unlocked ? bind({ from: 'slot', id, slot: i }) : {})}
              >
                {id ? (
                  <span className="flip" style={{ transitionDelay: animate ? `${1500 + i * 180}ms` : '0ms' }}>
                    <CardFront id={id} compact />
                    {/* 裏面（見取り図）は解錠したときに初めて描画する */}
                    {unlocked && <CardBack id={id} />}
                  </span>
                ) : (
                  <span className="slot-empty">空</span>
                )}
              </button>
            </li>
          ))}
        </ol>
        {unlocked && <p className="map-caption">書斎A ― 通路 ― もう一つの部屋</p>}
      </div>

      {ghost && (
        <span className="drag-ghost card-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <CardFront id={ghost.payload.id} compact />
        </span>
      )}

      {unlocked ? (
        <p className="description">錠は外れた。扉は、もう開く。</p>
      ) : (
        <>
          <p className="op-help">
            {sel?.kind === 'card'
              ? `記録カード${sel.id}を選んでいる。置きたい枠をタップ。`
              : '持ち物のカードを選んで枠をタップ（ドラッグでも置ける）。枠のカードをタップすると持ち物に戻る。'}
          </p>
          <p className="description small">集めた記録　{heldCount(p)} / 4</p>
          <InventoryBar dragBind={(id) => bind({ from: 'inv', id })} />
        </>
      )}
    </>
  );
}
