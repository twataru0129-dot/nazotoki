import { existsSync } from 'node:fs';
import path from 'node:path';
import { tapRects } from './geometry';
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

  // 背景の未完成点はゲーム画面に出さず、ASSET_PROVENANCE.md の「未完成の部分」に記録する

  it('同じ方角のホットスポットどうしは重ならない', () => {
    const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const f of FACINGS) {
      const hs = SCENES[f].hotspots;
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) expect(overlap(hs[i].rect, hs[j].rect), `${f}: ${hs[i].id} × ${hs[j].id}`).toBe(false);
    }
  });
});

describe('机：天板の物と引き出しは別々のタップ対象', () => {
  const north = SCENES.north.hotspots;
  const action = (id: string) => north.find((h) => h.id === id)!.action;

  it('写真・小箱・紙・ランプは引き出しの画面を開かない。引き出し3つだけが引き出しの画面を開く', () => {
    expect(action('photo')).toEqual({ type: 'closeup', id: 'photo' });
    expect(action('box')).toEqual({ type: 'closeup', id: 'box' });
    expect(action('paper').type).toBe('monologue');
    expect(action('lamp').type).toBe('monologue');
    const toDesk = north.filter((h) => h.action.type === 'closeup' && h.action.id === 'desk').map((h) => h.id);
    expect(toDesk).toEqual(['drawer-left', 'drawer-middle', 'drawer-right']);
  });

  it('引き出しは背景の机の上で左・中央・右の順に横に並ぶ', () => {
    const [l, m, r] = ['drawer-left', 'drawer-middle', 'drawer-right'].map((id) => north.find((h) => h.id === id)!.rect);
    expect(l.x + l.w).toBeLessThanOrEqual(m.x);
    expect(m.x + m.w).toBeLessThanOrEqual(r.x);
    expect(Math.abs(l.y - m.y)).toBeLessThan(10);
    expect(Math.abs(l.y - r.y)).toBeLessThan(10);
  });
});

describe('タップ領域の配置（tapRects）', () => {
  const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
  const contains = (a: Rect, b: Rect) => a.x <= b.x + 1e-6 && a.y <= b.y + 1e-6 && a.x + a.w >= b.x + b.w - 1e-6 && a.y + a.h >= b.y + b.h - 1e-6;
  // ステージの表示幅：iPhone SE（320）〜タブレット・PC（1280）、ブラウザの拡大・縮小を含む
  const widths = [240, 320, 375, 390, 430, 568, 667, 844, 1024, 1280, 2000];

  it('どの画面幅でも、広げたタップ領域どうしが重ならず、元の矩形を含み、背景からはみ出さない', () => {
    for (const f of FACINGS) {
      const rects = SCENES[f].hotspots.map((h) => h.rect);
      for (const w of widths) {
        const out = tapRects(rects, w / SCENE_W);
        out.forEach((r, i) => {
          expect(contains(r, rects[i]), `${f}@${w}: ${SCENES[f].hotspots[i].id} が元の矩形を含む`).toBe(true);
          expect(inside(r), `${f}@${w}: ${SCENES[f].hotspots[i].id} が背景内`).toBe(true);
        });
        for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(overlap(out[i], out[j]), `${f}@${w}: ${i}×${j}`).toBe(false);
      }
    }
  });

  it('机の写真の中心を押しても、引き出しの領域には入らない（スマホ幅）', () => {
    const hs = SCENES.north.hotspots;
    const out = tapRects(hs.map((h) => h.rect), 320 / SCENE_W);
    const photo = hs.find((h) => h.id === 'photo')!.rect;
    const pt = { x: photo.x + photo.w / 2, y: photo.y + photo.h };
    const hit = hs.filter((_, i) => pt.x >= out[i].x && pt.x < out[i].x + out[i].w && pt.y >= out[i].y && pt.y < out[i].y + out[i].h).map((h) => h.id);
    expect(hit).toEqual(['photo']);
  });
});

