import { existsSync } from 'node:fs';
import path from 'node:path';
import { OVERLAYS, SCENES } from './scenes';
import { FACINGS, SCENE_H, SCENE_W, type CloseupId, type Rect } from './types';

const inside = (r: Rect) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= SCENE_W && r.y + r.h <= SCENE_H;
const publicFile = (p: string) => path.resolve(__dirname, '../../public/assets', p);

describe('4方向の配置（設計書§3）', () => {
  const closeupsOf = (f: (typeof FACINGS)[number]) =>
    SCENES[f].hotspots.flatMap((h) => (h.action.type === 'closeup' ? [h.action.id] : []));

  it('北＝本棚＋机、東＝時計＋窓、南＝扉、西＝絵画', () => {
    expect(closeupsOf('north')).toEqual(expect.arrayContaining<CloseupId>(['bookshelf', 'desk']));
    expect(closeupsOf('east')).toEqual(expect.arrayContaining<CloseupId>(['clock', 'window']));
    expect(closeupsOf('south')).toEqual(['door']);
    expect(closeupsOf('west')).toEqual(['paintings']);
  });

  it('時計・扉・絵画・本棚は決められた方角にしかない', () => {
    const where = (id: CloseupId) => FACINGS.filter((f) => closeupsOf(f).includes(id));
    expect(where('bookshelf')).toEqual(['north']);
    expect(where('desk')).toEqual(['north']);
    expect(where('clock')).toEqual(['east']);
    expect(where('window')).toEqual(['east']);
    expect(where('door')).toEqual(['south']);
    expect(where('paintings')).toEqual(['west']);
  });

  it('ホットスポットと重ね表示はすべて背景の範囲内', () => {
    for (const f of FACINGS) for (const h of SCENES[f].hotspots) expect(inside(h.rect), `${f}/${h.id}`).toBe(true);
    expect(inside(OVERLAYS.clockFace)).toBe(true);
    expect(inside(OVERLAYS.doorDevice)).toBe(true);
    for (const r of Object.values(OVERLAYS.paintingCanvases)) expect(inside(r)).toBe(true);
  });

  it('ホットスポットIDは方角内で重複しない', () => {
    for (const f of FACINGS) {
      const ids = SCENES[f].hotspots.map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('背景画像が public/assets に存在する', () => {
    for (const f of FACINGS) expect(existsSync(publicFile(SCENES[f].image)), SCENES[f].image).toBe(true);
  });

  it('仮背景にはすべて未修正点の説明が付いている（完成扱いにしない）', () => {
    for (const f of FACINGS) expect(SCENES[f].provisional, f).toBeTruthy();
  });
});
