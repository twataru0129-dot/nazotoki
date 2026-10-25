import { assetUrl } from '../../game/assets';

// 机の上に立てた写真立て（探索画面用の小さな絵）。中身は拡大画面と同じ写真（photo/old_photo.webp）。
// 書斎Aは1人。書斎Bには「Aにはいないもう1人」も写っている（設計書§2.3。真相は語らない）。
// Bのもう1人は、Aで光沢が違う右端の位置に、同じセピアの影として重ねる。
export function PhotoFrame({ room, className }: { room: 'A' | 'B'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 52" aria-hidden="true" data-photo={room}>
      <path d="M8 50 L14 40 M52 50 L46 40" stroke="#3a2614" strokeWidth="2" />
      <rect x="2" y="2" width="56" height="42" rx="2" fill="#6d4a22" stroke="#b99a60" strokeWidth="1.6" />
      {/* 写真（802×540）を枠の内側 46×32 に収める（比率をほぼ保ち、はみ出しは切る） */}
      <image href={assetUrl('photo/old_photo.webp')} x="7" y="7" width="46" height="32" preserveAspectRatio="xMidYMid slice" />
      {room === 'B' && (
        <g fill="#2e2216" opacity=".82" data-extra-person="">
          <circle cx="46" cy="21" r="2.6" />
          <path d="M42.2 39 Q43 26.5 46 25.5 Q49 26.5 49.8 39 Z" />
        </g>
      )}
      {room === 'A' && <rect x="40" y="7" width="13" height="32" fill="#fff6e0" opacity=".16" />}
    </svg>
  );
}
