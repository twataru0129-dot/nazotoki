import { useCallback, useRef, useState, type PointerEvent } from 'react';

// ドラッグ＆ドロップの共通処理。8px 以上動いたらドラッグ、それ未満はふつうのタップ（click）として扱う。
// ドロップ先は data-drop 属性を持つ要素。ドラッグできない環境でもタップ操作だけで同じことができる前提で使う。
const THRESHOLD = 8;

export interface DragGhost<T> {
  payload: T;
  x: number;
  y: number;
}

export function useDrag<T>(onDrop: (payload: T, drop: string | null) => void) {
  const start = useRef<{ x: number; y: number; payload: T; id: number } | null>(null);
  const moved = useRef(false);
  const [ghost, setGhost] = useState<DragGhost<T> | null>(null);

  const bind = useCallback(
    (payload: T) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (!e.isPrimary || e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, payload, id: e.pointerId };
        moved.current = false;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        if (!moved.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) < THRESHOLD) return;
        moved.current = true;
        setGhost({ payload: s.payload, x: e.clientX, y: e.clientY });
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        const s = start.current;
        start.current = null;
        if (!s || s.id !== e.pointerId) return;
        if (moved.current) {
          setGhost(null);
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop]');
          onDrop(s.payload, el?.dataset.drop ?? null);
        }
      },
      onPointerCancel: () => {
        start.current = null;
        moved.current = false;
        setGhost(null);
      },
      onClickCapture: (e: { stopPropagation: () => void; preventDefault: () => void }) => {
        // ドラッグした直後のクリックはタップ扱いにしない
        if (moved.current) {
          e.stopPropagation();
          e.preventDefault();
          moved.current = false;
        }
      },
    }),
    [onDrop],
  );

  return { bind, ghost };
}
