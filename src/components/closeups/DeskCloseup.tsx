import { DRAWER_LABELS } from '../../game/text';
import { DevNote } from '../DevNote';

export function DeskCloseup() {
  return (
    <>
      <div className="desk">
        <div className="desk-box" role="img" aria-label="机上の小箱。鍵がかかっている">
          <svg viewBox="0 0 120 80" aria-hidden="true">
            <rect x="8" y="22" width="104" height="50" rx="4" fill="#5a3b22" stroke="#B99A60" strokeWidth="3" />
            <rect x="4" y="12" width="112" height="16" rx="4" fill="#6d4729" stroke="#B99A60" strokeWidth="3" />
            <rect x="52" y="34" width="16" height="20" rx="3" fill="#B99A60" />
            <circle cx="60" cy="41" r="3" fill="#2b1d12" />
            <rect x="58.5" y="42" width="3" height="7" fill="#2b1d12" />
          </svg>
          <span>小箱（鍵穴がある）</span>
        </div>
        <ol className="drawers" aria-label="3つの引き出し">
          {(['left', 'middle', 'right'] as const).map((k) => (
            <li key={k} className="drawer">
              <span className="drawer-pos">{{ left: '左', middle: '中央', right: '右' }[k]}</span>
              <span className="drawer-label">「{DRAWER_LABELS[k]}」</span>
              <span className="drawer-handle" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>
      <DevNote>引き出しを開ける操作、鍵の入手、小箱の解錠は第2段階で実装します。</DevNote>
    </>
  );
}
