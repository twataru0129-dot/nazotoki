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
