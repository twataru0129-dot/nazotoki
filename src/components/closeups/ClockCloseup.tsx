import { useRef, useState, type PointerEvent } from 'react';
import { CLOCK_SOLUTION, normalizeClock } from '../../game/logic';
import { cardRevealed } from '../../game/state';
import { useGame } from '../../game/store';
import { useFreshFx } from '../../game/useFreshFx';
import { CardFront } from '../art/CardFace';
import { ClockFace, formatTime } from '../art/ClockFace';

export function ClockCloseup() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const { minutes, solved, compartmentOpen } = p.clock;
  const svgRef = useRef<HTMLDivElement>(null);
  // ドラッグ中は手元だけで針を動かし、指を離した時刻で判定する（途中で00:14を通過しても解けない）
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? minutes;
  const animate = useFreshFx('clock-solved', 'clock');
  const returning = useFreshFx('card-take-D', 'clock-hands');

  // 分針のドラッグ：指の角度から「分」を求め、前回との差（±30分以内に丸める）だけ進める
  const angleMinute = (e: PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)));
    return Math.round(((a * 180) / Math.PI + 360) % 360 / 6) % 60;
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (solved || !e.isPrimary) return;
    setPreview(minutes);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (preview === null || solved) return;
    let d = angleMinute(e) - (preview % 60);
    if (d > 30) d -= 60;
    if (d < -30) d += 60;
    if (d !== 0) setPreview(normalizeClock(preview + d));
  };
  const onUp = () => {
    if (preview !== null && preview !== minutes) dispatch({ type: 'setClock', minutes: preview });
    setPreview(null);
  };

  return (
    <>
      <div className="clock-closeup">
        <div
          ref={svgRef}
          className={`clock-dial${solved ? ' is-locked' : ''}`}
          data-testid="clock-dial"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setPreview(null)}
        >
          <ClockFace minutes={shown} className="clock-big" transitionMs={preview !== null ? 0 : returning ? 1400 : 200} />
        </div>
        <div className="clock-controls">
          <button type="button" className="round-btn" onClick={() => dispatch({ type: 'adjustClock', delta: -1 })} disabled={solved} aria-label="針を1分戻す">
            −1分
          </button>
          <output className="clock-readout" aria-live="polite" data-testid="clock-readout">
            {formatTime(shown)}
          </output>
          <button type="button" className="round-btn" onClick={() => dispatch({ type: 'adjustClock', delta: 1 })} disabled={solved} aria-label="針を1分進める">
            ＋1分
          </button>
        </div>
      </div>
      {!solved && <p className="op-help">分針をドラッグするか、±1分のボタンで針を動かす。</p>}
      <div className={`compartment${compartmentOpen ? ' is-open' : ''}${animate ? ' animate-open' : ''}`} aria-label="時計の下の収納">
        {compartmentOpen ? (
          cardRevealed(p, 'D') ? (
            <button type="button" className="card-pick" onClick={() => dispatch({ type: 'takeCard', id: 'D' })} aria-label="記録カードDを取る">
              <CardFront id="D" />
              <span className="pick-label">取る</span>
            </button>
          ) : (
            <span className="behind-empty">収納は空だ。針は {formatTime(minutes)} を指している。</span>
          )
        ) : (
          <span className="compartment-closed">振り子の下に、小さな扉がある。</span>
        )}
      </div>
      {solved && p.clock.handsReturned && <p className="description">さっきは確かに{formatTime(CLOCK_SOLUTION)}に合わせたはずなのに、針はまた0時17分を指している。</p>}
    </>
  );
}
