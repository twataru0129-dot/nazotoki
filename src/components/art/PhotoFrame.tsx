// 机の上に立てた写真立て（探索画面用の小さな絵）。
// 書斎Aは2人、書斎Bは「Aにはいないもう1人」を加えた3人（設計書§2.3。真相は語らない）。
export function PhotoFrame({ room, className }: { room: 'A' | 'B'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 52" aria-hidden="true" data-photo={room}>
      <path d="M8 50 L14 40 M52 50 L46 40" stroke="#3a2614" strokeWidth="2" />
      <rect x="2" y="2" width="56" height="42" rx="2" fill="#6d4a22" stroke="#b99a60" strokeWidth="1.6" />
      <rect x="7" y="7" width="46" height="32" fill="#bfa47a" />
      <path d="M10 26 L22 18 L34 26 V36 H10 Z" fill="#6b5538" opacity=".5" />
      <g fill="#3d2f1f" opacity=".85">
        <circle cx="20" cy="25" r="2.6" />
        <path d="M16 39 Q17 29 20 28 Q23 29 24 39 Z" />
        <circle cx="30" cy="24.5" r="2.8" />
        <path d="M26 39 Q27 28 30 27.5 Q33 28 34 39 Z" />
        {room === 'B' && (
          <>
            <circle cx="42" cy="24" r="2.8" />
            <path d="M38 39 Q39 27.5 42 27 Q45 27.5 46 39 Z" />
          </>
        )}
      </g>
      {room === 'A' && <rect x="38" y="7" width="15" height="32" fill="#fff6e0" opacity=".18" />}
    </svg>
  );
}
