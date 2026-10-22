import { useMemo } from 'react';
import { useGame } from './store';

// 成功演出を「その出来事が起きた直後に、その場で1回だけ」再生するための判定。
// 一度再生した出来事（fx.n）は記録し、画面を開き直したり向きを変えたりしても再生しない。
const consumed = new Map<string, number>();

export function useFreshFx(key: string, slot = key): boolean {
  const { state } = useGame();
  const fx = state.fx;
  return useMemo(() => {
    if (!fx || !fx.key.split('|').includes(key)) return false;
    if (consumed.get(slot) === fx.n) return false;
    consumed.set(slot, fx.n);
    return true;
    // fx.n が変わったときだけ判定し直す（同じ表示中は true のまま）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx?.n]);
}

/** 「painting-wrong-A」のような出来事の、接頭辞のあとの部分（直後の1回だけ） */
export function useFreshFxSuffix(prefix: string, slot = prefix): string | null {
  const { state } = useGame();
  const fx = state.fx;
  return useMemo(() => {
    const hit = fx?.key.split('|').find((k) => k.startsWith(prefix));
    if (!fx || !hit) return null;
    if (consumed.get(slot) === fx.n) return null;
    consumed.set(slot, fx.n);
    return hit.slice(prefix.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx?.n]);
}
