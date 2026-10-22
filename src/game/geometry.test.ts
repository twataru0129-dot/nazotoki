import { containFit, rectToPercent, screenToScene, turn } from './geometry';
import { SCENE_H, SCENE_W } from './types';

describe('geometry', () => {
  it('背景座標を百分率に変換する', () => {
    expect(rectToPercent({ x: 0, y: 0, w: SCENE_W, h: SCENE_H })).toEqual({ left: 0, top: 0, width: 100, height: 100 });
    const p = rectToPercent({ x: 724, y: 543, w: 144.8, h: 108.6 });
    expect(p.left).toBeCloseTo(50);
    expect(p.top).toBeCloseTo(50);
    expect(p.width).toBeCloseTo(10);
    expect(p.height).toBeCloseTo(10);
  });

  it.each([
    [375, 281],
    [375, 667],
    [1280, 600],
    [667, 375],
  ])('contain 表示で4:3を保ち、画面座標⇔背景座標が往復で一致する（%i×%i）', (w, h) => {
    const fit = containFit(w, h);
    expect(fit.w / fit.h).toBeCloseTo(SCENE_W / SCENE_H, 5);
    expect(fit.w <= w + 1e-9 && fit.h <= h + 1e-9).toBe(true);
    const pt = screenToScene(fit.x + fit.w * 0.3, fit.y + fit.h * 0.7, fit);
    expect(pt.x).toBeCloseTo(SCENE_W * 0.3);
    expect(pt.y).toBeCloseTo(SCENE_H * 0.7);
  });

  it('左右の回転は4方向で一周する', () => {
    let i = 0;
    for (let k = 0; k < 4; k++) i = turn(i, 1);
    expect(i).toBe(0);
    expect(turn(0, -1)).toBe(3);
  });
});
