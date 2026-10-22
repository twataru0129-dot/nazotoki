import { useEffect, useRef } from 'react';
import { audio } from './audio';
import type { GameState } from './state';

// 出来事 → 効果音。出来事が起きた瞬間だけ鳴らす（再訪問・再読み込みでは鳴らない）。
// fx.key は「|」区切りで複数の出来事を持てる（例：カード取得と2枚目の物音が同時）。
// 音量・タイミングの最終調整は第4段階で行う。
type Cue = { sound?: string; at: number; duck?: number };
const CUES: Record<string, Cue[]> = {
  'books-move': [{ sound: 'book_move', at: 0 }],
  'books-solved': [{ sound: 'shelf_unlock', at: 0 }],
  'painting-solved': [{ sound: 'frame_move', at: 0 }],
  'drawer-open': [{ sound: 'drawer_open', at: 0 }],
  'box-open': [{ sound: 'box_unlock', at: 0 }],
  'clock-solved': [{ sound: 'clock_gear', at: 0 }],
  'card-take': [{ sound: 'card_pickup', at: 0 }],
  'card-take-D': [
    { sound: 'card_pickup', at: 0 },
    { sound: 'clock_reset', at: 700 },
  ],
  // 2枚目：取得音のあと、少し間を置いて壁の向こうの物音
  knock: [{ sound: 'mysterious_knock', at: 1600 }],
  // 4枚目：一瞬の静寂（BGM・雨音を絞る）
  silence: [{ at: 900, duck: 3500 }],
  // 扉：装置作動 → カード反転 → 解錠（約7秒の演出の骨組み。映像の仕上げは第5段階）
  'door-solved': [
    { sound: 'door_mechanism', at: 0 },
    { sound: 'card_flip', at: 1500 },
    { sound: 'door_unlock', at: 3800 },
  ],
  note: [{ sound: 'paper_turn', at: 0 }],
};

export function useFxSounds(fx: GameState['fx']) {
  const last = useRef<number>(fx?.n ?? 0);
  useEffect(() => {
    if (!fx || fx.n === last.current) return;
    last.current = fx.n;
    for (const key of fx.key.split('|')) {
      for (const c of CUES[key] ?? []) {
        window.setTimeout(() => {
          if (c.sound) audio.playSfx(c.sound, 150);
          if (c.duck) audio.duck(c.duck);
        }, c.at);
      }
    }
  }, [fx]);
}
