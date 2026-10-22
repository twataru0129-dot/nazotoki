export type Facing = 'north' | 'east' | 'south' | 'west';
export const FACINGS: Facing[] = ['north', 'east', 'south', 'west'];
export const FACING_LABEL: Record<Facing, string> = { north: '北', east: '東', south: '南', west: '西' };

export type Screen = 'title' | 'opening' | 'explore' | 'ending';

/** 拡大調査画面。謎の操作は第2段階で各画面に追加する */
export type CloseupId = 'bookshelf' | 'paintings' | 'desk' | 'clock' | 'door' | 'window';

/** 探索画面の上に重ねる画面（同時に1つだけ） */
export type OverlayId = 'inventory' | 'notebook' | 'hints' | 'settings' | 'letter';

export type PuzzleId = 'books' | 'paintings' | 'desk' | 'clock' | 'door';
export const PUZZLES: PuzzleId[] = ['books', 'paintings', 'desk', 'clock', 'door'];

/** 背景画像の座標系（元画像の画素）。ホットスポットはすべてこの座標で定義する */
export const SCENE_W = 1448;
export const SCENE_H = 1086;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HotspotAction = { type: 'closeup'; id: CloseupId } | { type: 'monologue'; text: string };

export interface Hotspot {
  id: string;
  label: string;
  rect: Rect;
  action: HotspotAction;
}

export interface SceneDef {
  facing: Facing;
  image: string;
  /** 背景が未完成（仮素材）の場合の説明。null なら完成扱い */
  provisional: string | null;
  hotspots: Hotspot[];
}
