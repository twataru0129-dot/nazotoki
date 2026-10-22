import { useId } from 'react';
import { BOOKS, type BookId, type BookSymbol } from '../../game/logic';

// 本棚の謎の本（背表紙）。
// 輪郭・帯・記号の図形は⑬の books/book_*.svg と同じ座標（156×420）をそのまま使い、
// 古い革の質感と、金箔押し（凹みの影＋金のグラデーション）を加えている。
// 左右の記号は logic.ts の BOOKS から決まるため、並べ替えても本と記号の対応はずれない。

const LEATHER: Record<BookId | 'red', { base: string; dark: string }> = {
  // 書斎Bにだけある赤い本（謎の本ではないため記号を持たない）
  red: { base: '#7a1f1c', dark: '#3a0d0c' },
  blue: { base: '#1C3C74', dark: '#0d1d3a' },
  ivory: { base: '#E4D5AF', dark: '#a8956a' },
  black: { base: '#252526', dark: '#0b0b0c' },
  green: { base: '#27543C', dark: '#10281b' },
};

/** ⑬の記号（中心 0,0、約34×34） */
function SymbolShape({ s }: { s: BookSymbol }) {
  switch (s) {
    case 'moon':
      return <path d="M9 -15 A16 16 0 1 0 9 15 A12 12 0 0 1 9 -15 Z" />;
    case 'wave':
      return (
        <g fill="none" strokeWidth="3.1" strokeLinecap="round">
          <path d="M-15 -9 Q-7 -16 0 -9 T15 -9" />
          <path d="M-15 0 Q-7 -7 0 0 T15 0" />
          <path d="M-15 9 Q-7 2 0 9 T15 9" />
        </g>
      );
    case 'leaf':
      return (
        <g fill="none">
          <path d="M-12 13 Q-12 -15 14 -15 Q17 9 -12 13 Z" strokeWidth="3" />
          <path d="M-12 13 L11 -10 M-3 4 L-6 -4 M2 -2 L10 -3" strokeWidth="2" />
        </g>
      );
    case 'star':
      return <path d="M0 -17 L4 -5 L15 -12 L8 0 L17 4 L5 5 L11 15 L0 8 L-11 15 L-5 5 L-17 4 L-8 0 L-15 -12 L-4 -5 Z" />;
    case 'sun':
      return (
        <g strokeWidth="2.6" strokeLinecap="round">
          <circle r="9" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="0" y1="-13" x2="0" y2="-19" transform={`rotate(${i * 45})`} />
          ))}
        </g>
      );
  }
}

export function BookArt({ id, className, stretch = false }: { id: BookId | 'red'; className?: string; stretch?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const { base, dark } = LEATHER[id];
  const sym = id === 'red' ? null : BOOKS[id];
  const light = id === 'ivory';
  const gold = `url(#gold-${uid})`;
  // 枠・帯は単色の金（明るい革では濃い金）
  const trim = light ? '#8a6424' : '#c9a56c';
  // 箔押しの凹み：明るい革では濃い茶、暗い革では黒の影を下に敷く
  const shade = light ? '#4a3416' : '#000';

  const stamp = (s: BookSymbol, x: number, side: 'left' | 'right') => (
    <g transform={`translate(${x} 207) scale(1.32)`} data-symbol={s} data-side={side}>
      <g transform="translate(0.9 1.1)" fill={shade} stroke={shade} opacity={light ? 0.75 : 0.85}>
        <SymbolShape s={s} />
      </g>
      <g fill={gold} stroke={gold}>
        <SymbolShape s={s} />
      </g>
    </g>
  );

  return (
    <svg className={className} viewBox="0 0 156 420" aria-hidden="true" data-book-art={id} preserveAspectRatio={stretch ? 'none' : undefined}>
      <defs>
        <linearGradient id={`leather-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset=".16" stopColor={base} />
          <stop offset=".55" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        {/* 記号の座標（中心0,0・約±19）に固定。直線（光線・仕切り線）でも色が消えないよう userSpaceOnUse にする */}
        <linearGradient id={`gold-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="-19" x2="0" y2="19">
          <stop offset="0" stopColor={light ? '#a87a2c' : '#fbe7a6'} />
          <stop offset=".5" stopColor={light ? '#7a531a' : '#d6ad5c'} />
          <stop offset="1" stopColor={light ? '#5c3c12' : '#9c7434'} />
        </linearGradient>
        {/* 革のしぼと擦れ */}
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={id.length * 7} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <radialGradient id={`wear-${uid}`} cx=".5" cy=".5" r=".7">
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".35" />
        </radialGradient>
      </defs>
      <rect x="5" y="4" width="146" height="412" rx="13" fill={`url(#leather-${uid})`} />
      <rect x="5" y="4" width="146" height="412" rx="13" fill="#000" filter={`url(#grain-${uid})`} />
      <rect x="5" y="4" width="146" height="412" rx="13" fill={`url(#wear-${uid})`} />
      <rect x="5" y="4" width="146" height="412" rx="13" fill="none" stroke={trim} strokeWidth="4" />
      <rect x="13" y="12" width="130" height="396" rx="9" fill="none" stroke={trim} strokeWidth="2" opacity=".85" />
      <path d="M17 95 H139 M17 111 H139 M17 293 H139 M17 309 H139" stroke={trim} strokeWidth="4" />
      <path d="M78 150 V264" stroke={trim} strokeWidth="1.8" opacity=".8" />
      {sym && stamp(sym.left, 42, 'left')}
      {sym && stamp(sym.right, 114, 'right')}
      <path d="M58 36 L78 20 L98 36 L78 52 Z M58 382 L78 365 L98 382 L78 397 Z" fill="none" stroke={trim} strokeWidth="2" />
    </svg>
  );
}
