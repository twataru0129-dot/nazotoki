import { useEffect, useRef } from 'react';
import { audio } from './audio';
import type { GameState } from './state';

// 出来事 → 効果音。出来事が起きた瞬間だけ鳴らす（再訪問・再読み込みでは鳴らない）。
// 音量・タイミングの調整と、2枚目のノック等のイベント音は第4段階で行う。
const SFX: Record<string, string | string[]> = {
  'books-move': 'book_move',
  'books-solved': 'shelf_unlock',
  'painting-solved': 'frame_move',
  'drawer-open': 'drawer_open',
  'box-open': 'box_unlock',
  'clock-solved': 'clock_gear',
  'card-take': 'card_pickup',
  'card-take-D': ['card_pickup', 'clock_reset'],
  'door-solved': ['door_mechanism', 'card_flip', 'door_unlock'],
};
const DELAY: Record<string, number[]> = {
  'card-take-D': [0, 700],
  // 扉：装置作動 → カード反転 → 解錠（約7秒の演出の骨組み。映像の仕上げは第5段階）
  'door-solved': [0, 1500, 3800],
};

export function useFxSounds(fx: GameState['fx']) {
  const last = useRef<number>(fx?.n ?? 0);
  useEffect(() => {
    if (!fx || fx.n === last.current) return;
    last.current = fx.n;
    const s = SFX[fx.key];
    if (!s) return;
    const list = Array.isArray(s) ? s : [s];
    list.forEach((k, i) => window.setTimeout(() => audio.playSfx(k, 150), DELAY[fx.key]?.[i] ?? 0));
  }, [fx]);
}
