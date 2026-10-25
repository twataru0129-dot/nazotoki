import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { assetUrl } from '../game/assets';
import { rectToPercent, tapRects } from '../game/geometry';
import { OVERLAYS, SCENES } from '../game/scenes';
import { useGame } from '../game/store';
import { FACING_LABEL, SCENE_W, type Hotspot, type Rect } from '../game/types';
import { ClockFace } from './art/ClockFace';
import { DoorDevice } from './art/DoorDevice';
import { NorthDecor } from './SceneDecor';
import { DoorOpening } from './DoorOpening';

const SWIPE_MIN = 48;

function place(r: Rect): CSSProperties {
  const p = rectToPercent(r);
  return { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` };
}


export function SceneStage({ highlight }: { highlight: boolean }) {
  const { state, dispatch } = useGame();
  const scene = SCENES[state.facing];
  const p = state.progress;
  // 南：解錠後は開扉の画像（閉扉と同じベースから作ったもの）に切り替える。開く演出は第5段階
  const southOpen = state.facing === 'south' && p.door.unlocked;
  const image = southOpen ? 'bg/a_south_open.webp' : scene.image;
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const [dragDx, setDragDx] = useState(0);
  // ステージの表示幅（画面サイズ・向き・ブラウザの拡大率が変わるたびに測り直す）
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageW(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // タップ領域：小さな物は最小44pxまで広げ、隣と重なる部分は隙間の中央で切る（背景に対する位置は画面サイズで変わらない）
  const spots = useMemo(() => tapRects(scene.hotspots.map((h) => h.rect), stageW / SCENE_W), [scene, stageW]);

  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swiped.current = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 12) setDragDx(Math.max(-40, Math.min(40, dx / 4)));
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    setDragDx(0);
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      // 指を左へ払う＝右を向く（画像が左へ流れる）
      dispatch({ type: 'turn', dir: dx < 0 ? 1 : -1 });
    }
  };

  const activate = (h: Hotspot) => {
    if (swiped.current) return;
    if (h.action.type === 'closeup') dispatch({ type: 'openCloseup', id: h.action.id });
    else if (h.action.type === 'examine') dispatch({ type: 'discover', id: h.action.id });
    else dispatch({ type: 'say', text: h.action.text });
  };

  const turnClass = state.lastTurn ? (state.lastTurn.dir === 1 ? 'enter-from-right' : 'enter-from-left') : '';

  return (
    <div className="stage-box">
      <div
        ref={stageRef}
        className="stage"
        data-testid="stage"
        data-facing={state.facing}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDragDx(0);
        }}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        style={{ '--drag': `${dragDx}px` } as CSSProperties}
      >
        <div key={`${state.facing}-${state.lastTurn?.n ?? 0}`} className={`stage-layer ${turnClass}`}>
          <img
            className="stage-bg"
            src={assetUrl(image)}
            alt={`書斎A・${FACING_LABEL[state.facing]}の壁`}
            draggable={false}
          />
          {state.facing === 'north' && <NorthDecor room="A" order={p.books.order} />}
          {state.facing === 'east' && (
            <div className="stage-overlay" style={place(OVERLAYS.clockFace)}>
              <ClockFace minutes={p.clock.minutes} className="fill" />
            </div>
          )}
          {state.facing === 'west' &&
            (['A', 'B', 'C', 'D'] as const).map((k) => (
              <div
                key={k}
                className={`stage-overlay painting-mat${k === 'C' && p.paintings.frameOpen ? ' is-tilted' : ''}`}
                style={place(OVERLAYS.paintingCanvases[k])}
              >
                <img src={assetUrl(`svg/paintings/painting_${k}.svg`)} alt="" draggable={false} />
              </div>
            ))}
          {state.facing === 'south' && !southOpen && (
            <div className="stage-overlay device-plate" style={place(OVERLAYS.doorDevice)}>
              <DoorDevice dialMinutes={p.door.dialMinute} className="fill" />
            </div>
          )}
          {southOpen && (
            <div className="stage-overlay device-plate" style={place(OVERLAYS.doorDeviceOpen)}>
              <DoorDevice dialMinutes={p.door.dialMinute} filled className="fill" stretch />
            </div>
          )}
          {/* 解錠の直後だけ：閉じた扉が開いた扉へ移る（同じベース画像なので扉だけが動いて見える） */}
          {southOpen && !state.closeup && <DoorOpening />}
          {scene.hotspots.map((h, i) => (
            <button
              key={h.id}
              type="button"
              className={`hotspot${h.action.type === 'examine' ? ' is-subtle' : highlight ? ' is-highlight' : ''}`}
              style={place(spots[i])}
              data-hotspot={h.id}
              aria-label={h.label}
              onClick={() => activate(h)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
