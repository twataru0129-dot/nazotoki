import type { Facing, SceneDef } from './types';

// 座標は背景画像（1448×1086）の画素。拡大調査は第2段階で各謎の操作を追加する。
export const SCENES: Record<Facing, SceneDef> = {
  north: {
    facing: 'north',
    image: 'bg/a_north.webp',
    hotspots: [
      { id: 'bookshelf', label: '本棚', rect: { x: 570, y: 190, w: 310, h: 145 }, action: { type: 'closeup', id: 'bookshelf' } },
      // 机：天板の上の物（写真・紙・小箱・ランプ）と、前面の3つの引き出しは別々のタップ対象。
      // どの矩形も互いに重ならない（scenes.test.ts）。小さな物は SceneStage で最小タップ寸法まで広げるが、
      // 隣と重なる部分は元の矩形どうしの隙間の中央で切る（geometry.ts の tapRects）。
      { id: 'drawer-left', label: '左の引き出し', rect: { x: 268, y: 712, w: 232, h: 80 }, action: { type: 'closeup', id: 'desk' } },
      { id: 'drawer-middle', label: '中央の引き出し', rect: { x: 510, y: 712, w: 420, h: 62 }, action: { type: 'closeup', id: 'desk' } },
      { id: 'drawer-right', label: '右の引き出し', rect: { x: 940, y: 712, w: 242, h: 80 }, action: { type: 'closeup', id: 'desk' } },
      { id: 'box', label: '机上の小箱', rect: { x: 990, y: 592, w: 110, h: 100 }, action: { type: 'closeup', id: 'box' } },
      { id: 'photo', label: '机上の写真', rect: { x: 640, y: 596, w: 120, h: 96 }, action: { type: 'closeup', id: 'photo' } },
      {
        id: 'lamp',
        label: '机のランプ',
        rect: { x: 1010, y: 425, w: 170, h: 120 },
        action: { type: 'monologue', text: '緑のシェードのランプ。机の上だけが、やけに明るい。' },
      },
      {
        id: 'paper',
        label: '机上の紙',
        rect: { x: 785, y: 620, w: 110, h: 72 },
        action: { type: 'monologue', text: '白い紙が一枚。何も書かれていない。' },
      },
    ],
  },
  east: {
    facing: 'east',
    image: 'bg/a_east.webp',
    hotspots: [
      { id: 'clock', label: '柱時計', rect: { x: 345, y: 20, w: 240, h: 770 }, action: { type: 'closeup', id: 'clock' } },
      { id: 'window', label: '雨の窓', rect: { x: 1100, y: 15, w: 345, h: 630 }, action: { type: 'closeup', id: 'window' } },
    ],
  },
  south: {
    facing: 'south',
    image: 'bg/a_south_closed.webp',
    hotspots: [
      { id: 'door', label: '施錠された扉', rect: { x: 560, y: 108, w: 444, h: 738 }, action: { type: 'closeup', id: 'door' } },
      // 任意調査O5：右の戸枠の蝶番（上）
      { id: 'hinge', label: '扉の蝶番', rect: { x: 1004, y: 130, w: 40, h: 84 }, action: { type: 'examine', id: 'O5' } },
    ],
  },
  west: {
    facing: 'west',
    image: 'bg/a_west.webp',
    hotspots: [
      { id: 'paintings', label: '4枚の絵画', rect: { x: 355, y: 95, w: 730, h: 550 }, action: { type: 'closeup', id: 'paintings' } },
    ],
  },
};

/** 北の壁に重ねる物（背景の空き棚・机上） */
export const DECOR = {
  /** 中段の空き棚（元画像の4冊があった場所） */
  northBooks: { x: 676, y: 228, w: 115, h: 88 },
  /** 机の上の写真立て（緑の革の上、ペン立ての左） */
  deskPhoto: { x: 692, y: 614, w: 52, h: 46 },
} as const;

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
  /** 南（開扉）：開いた扉板の上の装置 */
  doorDeviceOpen: { x: 736, y: 350, w: 268, h: 150 },
} as const;
