import { CARD_IDS, type CardId } from './logic';
import { cardRevealed, heldCount, type Progress } from './state';

// 探索サポート「次に何を調べる？」。謎のヒントとは別。答えや任意調査の場所は明かさない。
const CARD_PLACE: Record<CardId, string> = {
  A: '北の本棚の隠し収納',
  B: '西の絵画の裏',
  C: '北の机の木箱',
  D: '東の柱時計の収納',
};

export function explorationGuide(p: Progress): string[] {
  if (p.door.unlocked) return ['扉の錠は外れた。南の扉から先へ進める。'];

  const forgotten = CARD_IDS.filter((id) => cardRevealed(p, id));
  if (forgotten.length) return forgotten.map((id) => `${CARD_PLACE[id]}に、まだ取っていない記録がある。`);

  if (heldCount(p) === 4) return ['4枚の記録がそろった。南の扉の装置を調べよう。'];

  const lines: string[] = [];
  if (p.desk.key === 'inventory') lines.push('手に入れた小さな鍵を使える場所がある。北の机を調べよう。');
  const unsolved: string[] = [];
  if (!p.books.solved) unsolved.push('北の本棚');
  if (!p.paintings.solved) unsolved.push('西の絵画');
  if (!p.desk.boxOpen && p.desk.key !== 'inventory') unsolved.push('北の机');
  if (!p.clock.solved) unsolved.push('東の柱時計');
  if (unsolved.length) lines.push(`まだ謎が残っている場所：${unsolved.join('、')}。どこからでも調べられる。`);
  lines.push(`南の扉の装置は、記録がそろう前でも調べられる（記録 ${heldCount(p)} / 4）。`);
  return lines;
}
