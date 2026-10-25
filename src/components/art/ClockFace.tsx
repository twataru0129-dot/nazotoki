import { assetUrl } from '../../game/assets';

// 文字盤は clock_face_no_hands.svg（共通ベース）。針の角度と時刻表示は同じ数値（分）から計算する。
// 針の形は clock_hands_0014/0017.svg と同じ（400×400 の座標系）。
export function handAngles(totalMinutes: number) {
  const m = ((totalMinutes % 720) + 720) % 720;
  return { hour: (m / 60) * 30, minute: (m % 60) * 6 };
}

export function formatTime(totalMinutes: number) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function ClockFace({ minutes, className, transitionMs = 0 }: { minutes: number; className?: string; transitionMs?: number }) {
  const t = transitionMs ? `transform ${transitionMs}ms ease-in-out` : undefined;
  const { hour, minute } = handAngles(minutes);
  const [h, m] = formatTime(minutes).split(':').map(Number);
  return (
    <svg className={className} viewBox="0 0 400 400" role="img" aria-label={`時計の針は${h}時${m}分を指している`}>
      <image href={assetUrl('svg/clock_face.svg')} width="400" height="400" />
      <g className="clock-hand" style={{ transform: `rotate(${hour}deg)`, transformOrigin: '200px 200px', transition: t }}>
        <path d="M192 207 L194 153 L200 117 L206 153 L208 207" fill="#2E251C" stroke="#473520" strokeWidth="1.5" />
      </g>
      <g className="clock-hand" style={{ transform: `rotate(${minute}deg)`, transformOrigin: '200px 200px', transition: t }}>
        <path d="M196 220 L195 111 L200 62 L205 111 L204 220" fill="#24211C" stroke="#3F3327" strokeWidth="1.5" />
      </g>
      <circle cx="200" cy="200" r="8" fill="#A67B3A" stroke="#402E20" strokeWidth="3" />
    </svg>
  );
}
