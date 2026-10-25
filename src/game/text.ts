import type { CloseupId } from './types';

// 文言は設計書（第1章_完成設計書.md）の確定文面をそのまま使う。

export const TITLE = '午前0時17分の書斎';
export const CHAPTER_TITLE = '第1章　閉ざされた書斎';

export const OPENING_BEFORE = ['雨の夜。', '城戸透から届いた一通の手紙を頼りに、私は旧・霧島邸を訪れた。'];
export const OPENING_AFTER = ['書斎に足を踏み入れた瞬間、背後で扉が閉まり――', '鍵のかかる音がした。'];

/** §2.2 手紙の確定文面 */
export const LETTER_LINES = [
  'この手紙を読んでいるなら、私はもう屋敷から出られなくなっているのかもしれない。',
  '書斎には、私が残した4つの記録がある。',
  'それらを集め、扉を開けてほしい。',
  'そして覚えておいてほしい。',
  'この部屋には、一つだけ嘘がある。',
];
export const LETTER_TIME = '00:17';
export const LETTER_BACK = '裏面には何も書かれていない。紙は少し古びている。';

/** 各拡大画面の見出しと、設計書の確定文言 */
export const CLOSEUP_TEXT: Record<CloseupId, { title: string; inscription?: string; description?: string }> = {
  bookshelf: { title: '本棚', inscription: '月から太陽へ。途切れた道をつなげ。' },
  paintings: { title: '4枚の絵画', inscription: '影は、光の反対へ伸びる。' },
  desk: { title: '机の引き出し', inscription: '鍵は三つのうち一つにある。真実を語る札は、ただ一枚。' },
  box: { title: '机上の小箱' },
  photo: { title: '机上の古い写真' },
  clock: { title: '柱時計', inscription: 'この時計は、実際の時刻より3分進む。真実の時刻に針を戻せ。' },
  door: {
    title: '施錠された扉',
    inscription: '終わりから、始まりへ。針が見せる時刻ではなく、真実の時刻を示せ。失われた記憶をたどれ。',
  },
  window: { title: '雨の窓', description: '雨が窓を叩いている。外には暗い庭木が並び、遠くに小さな灯りがひとつ見えるだけだ。' },
};

/** §7 机の札 */
export const DRAWER_LABELS = { left: '鍵は中央にある', middle: '鍵は中央にはない', right: '鍵は右にはない' } as const;
