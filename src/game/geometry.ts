import { SCENE_H, SCENE_W, type Rect } from './types';

/** 背景座標の矩形を、ステージ（背景と同じ4:3の箱）に対する百分率へ変換する。
 *  百分率で配置するため、画面サイズや向きが変わってもタップ位置は画像に対してずれない。 */
export function rectToPercent(r: Rect): { left: number; top: number; width: number; height: number } {
  return {
    left: (r.x / SCENE_W) * 100,
    top: (r.y / SCENE_H) * 100,
    width: (r.w / SCENE_W) * 100,
    height: (r.h / SCENE_H) * 100,
  };
}

/** 箱（containerW×containerH）に 4:3 の背景を contain で収めたときの表示矩形 */
export function containFit(containerW: number, containerH: number): Rect {
  const scale = Math.min(containerW / SCENE_W, containerH / SCENE_H);
  const w = SCENE_W * scale;
  const h = SCENE_H * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

/** 画面上の点（containFit 済みの表示矩形内）を背景座標へ戻す */
export function screenToScene(px: number, py: number, fit: Rect): { x: number; y: number } {
  return { x: ((px - fit.x) / fit.w) * SCENE_W, y: ((py - fit.y) / fit.h) * SCENE_H };
}

export function turn(facingIndex: number, dir: -1 | 1): number {
  return (facingIndex + dir + 4) % 4;
}

/**
 * タップ領域の配置（背景座標）。小さな物は最小 minPx（画面上の画素）まで中心から広げるが、
 * 広げた結果が隣の領域と重なる場合は、元の矩形どうしの隙間の中央で切る。
 * - 結果どうしは重ならない（元の矩形どうしが重ならない限り）。
 * - 結果は元の矩形より小さくならず、背景の外へははみ出さない。
 * scale は「画面上の画素 ÷ 背景座標」（ステージの幅 ÷ SCENE_W）。
 */
export function tapRects(rects: Rect[], scale: number, minPx = 44): Rect[] {
  const min = scale > 0 ? minPx / scale : 0;
  const box = rects.map((r) => {
    const w = Math.min(SCENE_W, Math.max(r.w, min));
    const h = Math.min(SCENE_H, Math.max(r.h, min));
    const x0 = Math.max(0, Math.min(SCENE_W - w, r.x + r.w / 2 - w / 2));
    const y0 = Math.max(0, Math.min(SCENE_H - h, r.y + r.h / 2 - h / 2));
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = box[i];
      const b = box[j];
      if (a.x0 >= b.x1 || b.x0 >= a.x1 || a.y0 >= b.y1 || b.y0 >= a.y1) continue;
      const ra = rects[i];
      const rb = rects[j];
      // 元の矩形の間の隙間（横・縦）。大きいほうの向きで切り分ける
      const gapX = Math.max(rb.x - (ra.x + ra.w), ra.x - (rb.x + rb.w));
      const gapY = Math.max(rb.y - (ra.y + ra.h), ra.y - (rb.y + rb.h));
      if (gapX < 0 && gapY < 0) continue; // 元の矩形が重なっている（データの誤り。scenes.test.ts で検出）
      if (gapX >= gapY) {
        const [l, r, lr, rr] = ra.x < rb.x ? [a, b, ra, rb] : [b, a, rb, ra];
        const m = (lr.x + lr.w + rr.x) / 2;
        l.x1 = Math.min(l.x1, m);
        r.x0 = Math.max(r.x0, m);
      } else {
        const [t, u, tr, ur] = ra.y < rb.y ? [a, b, ra, rb] : [b, a, rb, ra];
        const m = (tr.y + tr.h + ur.y) / 2;
        t.y1 = Math.min(t.y1, m);
        u.y0 = Math.max(u.y0, m);
      }
    }
  }
  return box.map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }));
}
