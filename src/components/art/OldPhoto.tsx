import { useGame } from '../../game/store';
import { Examine } from '../Examine';

// 机の上の古い写真（任意調査O1）。屋敷の前に立つ人物は1人。右端だけ紙の光沢が違う。
// 人物が写るのは証拠としての写真だけ（設計書§13.1）。真相は語らない。
export function OldPhoto() {
  const { dispatch } = useGame();
  return (
    <div className="old-photo">
      <button
        type="button"
        className="photo-main"
        aria-label="机の上の古い写真を見る"
        onClick={() => dispatch({ type: 'say', text: '古い写真。屋敷の前で撮られたものらしい。人物の顔はよく見えない。' })}
      >
        <svg viewBox="0 0 240 160" aria-hidden="true">
          <defs>
            <linearGradient id="sepia" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#cdb48a" />
              <stop offset="1" stopColor="#8f7451" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="240" height="160" fill="#e9dcc2" />
          <rect x="10" y="10" width="220" height="140" fill="url(#sepia)" />
          {/* 屋敷 */}
          <path d="M30 80 L80 50 L130 80 V120 H30 Z" fill="#6b5538" opacity=".55" />
          <rect x="62" y="92" width="16" height="28" fill="#4a3a26" opacity=".6" />
          {/* 人物（1人）。右側には誰もいない */}
          <g fill="#3d2f1f" opacity=".85">
            <circle cx="96" cy="94" r="8.5" />
            <path d="M83 140 Q85 106 96 104 Q107 106 109 140 Z" />
          </g>
          <rect x="10" y="10" width="220" height="140" fill="none" stroke="#5a4630" strokeWidth="1" opacity=".5" />
        </svg>
      </button>
      {/* 右端：光沢だけが違う部分 */}
      <Examine id="O1" label="写真の右端を調べる" className="photo-edge">
        <span className="photo-gloss" aria-hidden="true" />
      </Examine>
    </div>
  );
}
