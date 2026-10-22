import type { Facing, SceneDef } from './types';

// 座標は背景画像（1448×1086）の画素。拡大調査は第2段階で各謎の操作を追加する。
export const SCENES: Record<Facing, SceneDef> = {
  north: {
    facing: 'north',
    image: 'bg/a_north.webp',
    provisional: '本棚の4冊が背景に描き込まれたまま／机上の写真が未配置',
    hotspots: [
      { id: 'bookshelf', label: '本棚', rect: { x: 570, y: 190, w: 310, h: 145 }, action: { type: 'closeup', id: 'bookshelf' } },
      { id: 'desk', label: '机の引き出し', rect: { x: 240, y: 695, w: 990, h: 95 }, action: { type: 'closeup', id: 'desk' } },
      { id: 'box', label: '机上の小箱', rect: { x: 985, y: 590, w: 110, h: 85 }, action: { type: 'closeup', id: 'desk' } },
      {
        id: 'lamp',
        label: '机のランプ',
        rect: { x: 1010, y: 425, w: 170, h: 120 },
        action: { type: 'monologue', text: '緑のシェードのランプ。机の上だけが、やけに明るい。' },
      },
      {
        id: 'paper',
        label: '机上の紙',
        rect: { x: 785, y: 620, w: 100, h: 42 },
        action: { type: 'monologue', text: '白い紙が一枚。何も書かれていない。' },
      },
    ],
  },
  east: {
    facing: 'east',
    image: 'bg/a_east.webp',
    provisional: '窓の外を加工した仮背景（雨の夜の敷地）／壁の版画は元画像のまま',
    hotspots: [
      { id: 'clock', label: '柱時計', rect: { x: 345, y: 20, w: 240, h: 770 }, action: { type: 'closeup', id: 'clock' } },
      { id: 'window', label: '雨の窓', rect: { x: 1100, y: 15, w: 345, h: 630 }, action: { type: 'closeup', id: 'window' } },
    ],
  },
  south: {
    facing: 'south',
    image: 'bg/a_south_closed.webp',
    provisional: '閉じた扉は開扉画像からの加工／左右の壁は塗り替え・減光の仮処置',
    hotspots: [
      { id: 'door', label: '施錠された扉', rect: { x: 560, y: 108, w: 460, h: 738 }, action: { type: 'closeup', id: 'door' } },
    ],
  },
  west: {
    facing: 'west',
    image: 'bg/a_west.webp',
    provisional: '窓を壁に加工した仮背景／額の中は謎用の正確な絵（SVG）で表示',
    hotspots: [
      { id: 'paintings', label: '4枚の絵画', rect: { x: 355, y: 95, w: 730, h: 550 }, action: { type: 'closeup', id: 'paintings' } },
    ],
  },
};

/** 背景上に重ねる、謎の正確な表示（生成画像の描き込みを覆う） */
export const OVERLAYS = {
  /** 東：柱時計の文字盤（中心 466,256） */
  clockFace: { x: 396, y: 186, w: 140, h: 140 },
  /** 西：4枚の額の内側（A 左上、B 右上、C 左下、D 右下） */
  paintingCanvases: {
    A: { x: 385, y: 123, w: 280, h: 207 },
    B: { x: 770, y: 123, w: 285, h: 207 },
    C: { x: 385, y: 413, w: 280, h: 204 },
    D: { x: 770, y: 413, w: 285, h: 204 },
  },
  /** 南：扉の解錠装置 */
  doorDevice: { x: 595, y: 330, w: 410, h: 187 },
} as const;
