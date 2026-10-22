import { assetUrl } from '../../game/assets';
import { DevNote } from '../DevNote';

// 初期並び：緑・黒・白・青（設計書§5）。並べ替え操作は第2段階で追加する。
const INITIAL = ['green', 'black', 'ivory', 'blue'] as const;
const NAME = { green: '緑の本', black: '黒の本', ivory: '白の本', blue: '青の本' } as const;

function Moon() {
  return (
    <svg viewBox="0 0 40 40" className="shelf-emblem" role="img" aria-label="左端の棚の月の意匠">
      <path d="M26 8 A14 14 0 1 0 26 32 A11 11 0 0 1 26 8 Z" fill="#C9A86A" />
    </svg>
  );
}
function Sun() {
  return (
    <svg viewBox="0 0 40 40" className="shelf-emblem" role="img" aria-label="右端の棚の太陽の意匠">
      <circle cx="20" cy="20" r="7.5" fill="#C9A86A" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="20" y1="8" x2="20" y2="3" stroke="#C9A86A" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45} 20 20)`} />
      ))}
    </svg>
  );
}

export function BookshelfCloseup() {
  return (
    <>
      <div className="shelf" aria-label="特別な4冊の本">
        <Moon />
        <ol className="shelf-books">
          {INITIAL.map((b) => (
            <li key={b}>
              <img src={assetUrl(`svg/books/book_${b}.svg`)} alt={NAME[b]} draggable={false} />
            </li>
          ))}
        </ol>
        <Sun />
      </div>
      <DevNote>本の並べ替え（ドラッグ／タップ入れ替え）は第2段階で実装します。</DevNote>
    </>
  );
}
