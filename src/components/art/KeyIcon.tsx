export function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'key-icon'} viewBox="0 0 64 32" aria-hidden="true">
      <circle cx="13" cy="16" r="9" fill="none" stroke="#C9A86A" strokeWidth="4" />
      <path d="M22 16 H58 M48 16 V24 M54 16 V22" stroke="#C9A86A" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
