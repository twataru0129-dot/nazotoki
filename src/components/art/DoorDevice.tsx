import { formatTime } from './ClockFace';

// door_four_slots.svg を基準にした扉の解錠装置。
// 元SVGの枠は横長でカード（200×270の縦長）が入らないため、枠を縦長に直している。
// ダイヤルの時刻は固定文字ではなく値から表示する。操作は第2段階で追加する。
export const DOOR_SLOTS = [0, 1, 2, 3].map((i) => ({ x: 60 + i * 210, y: 178, w: 170, h: 224 }));

export function DoorDevice({
  dialMinutes,
  className,
  filled = false,
  stretch = false,
}: {
  dialMinutes: number;
  className?: string;
  /** 解錠後：枠にカード（裏面）が収まっている */
  filled?: boolean;
  /** 斜めから見た扉に重ねるとき、枠に合わせて縦横を伸縮する */
  stretch?: boolean;
}) {
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = major ? 57 : 60;
    return (
      <line
        key={i}
        x1={460 + r1 * Math.sin(a)}
        y1={98 - r1 * Math.cos(a)}
        x2={460 + 63 * Math.sin(a)}
        y2={98 - 63 * Math.cos(a)}
        stroke="#56402A"
        strokeWidth={major ? 2 : 1}
      />
    );
  });
  return (
    <svg
      className={className}
      viewBox="0 0 920 420"
      role="img"
      preserveAspectRatio={stretch ? 'none' : undefined}
      aria-label={`扉の装置。カード枠が横一列に4つ、ダイヤルは${formatTime(dialMinutes)}`}
    >
      <defs>
        <linearGradient id="dd-metal" x1="0" x2="1">
          <stop stopColor="#8F6035" />
          <stop offset=".5" stopColor="#E3C581" />
          <stop offset="1" stopColor="#825B39" />
        </linearGradient>
      </defs>
      <rect x="5" y="6" width="910" height="408" rx="17" fill="#4A301C" stroke="url(#dd-metal)" strokeWidth="11" />
      <circle cx="460" cy="98" r="67" fill="#E5D2A6" stroke="#AE8A4E" strokeWidth="13" />
      {ticks}
      <text x="460" y="108" textAnchor="middle" fontSize="28" fontFamily="'Study Serif', serif" fill="#443223">
        {formatTime(dialMinutes)}
      </text>
      {DOOR_SLOTS.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="8" fill="#281B11" stroke="#D5AE70" strokeWidth="7" />
          <rect x={s.x + 10} y={s.y + 10} width={s.w - 20} height={s.h - 20} rx="3" fill={filled ? '#e3cfa2' : '#241A12'} stroke="#725635" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
