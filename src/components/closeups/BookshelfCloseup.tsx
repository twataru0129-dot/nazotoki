import { useCallback, useState } from 'react';
import { assetUrl } from '../../game/assets';
import { BOOKS, SYMBOL_NAME, type BookId } from '../../game/logic';
import { cardRevealed } from '../../game/state';
import { useGame } from '../../game/store';
import { CardFront } from '../art/CardFace';
import { useDrag } from '../useDrag';

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

const label = (b: BookId) => `${BOOKS[b].name}の本（左：${SYMBOL_NAME[BOOKS[b].left]}、右：${SYMBOL_NAME[BOOKS[b].right]}）`;

export function BookshelfCloseup() {
  const { state, dispatch } = useGame();
  const books = state.progress.books;
  const [picked, setPicked] = useState<number | null>(null);
  const animate = state.fx?.key === 'books-solved';

  const onDrop = useCallback(
    (from: number, drop: string | null) => {
      setPicked(null);
      if (drop?.startsWith('book-')) dispatch({ type: 'swapBooks', i: from, j: Number(drop.slice(5)) });
    },
    [dispatch],
  );
  const { bind, ghost } = useDrag<number>(onDrop);

  const tap = (i: number) => {
    if (books.solved) return;
    if (picked === null) setPicked(i);
    else if (picked === i) setPicked(null);
    else {
      dispatch({ type: 'swapBooks', i: picked, j: i });
      setPicked(null);
    }
  };

  return (
    <>
      <div className={`shelf${books.solved ? ' is-solved' : ''}`}>
        <Moon />
        <ol className="shelf-books" aria-label="特別な4冊の本（左から）">
          {books.order.map((b, i) => (
            <li key={b}>
              <button
                type="button"
                className={`book${picked === i ? ' is-picked' : ''}${ghost?.payload === i ? ' is-dragging' : ''}`}
                data-drop={`book-${i}`}
                data-book={b}
                aria-label={`${i + 1}番目：${label(b)}`}
                aria-pressed={picked === i}
                disabled={books.solved}
                onClick={() => tap(i)}
                {...(books.solved ? {} : bind(i))}
              >
                <img src={assetUrl(`svg/books/book_${b}.svg`)} alt="" draggable={false} />
              </button>
              <span className="book-caption" aria-hidden="true">
                {SYMBOL_NAME[BOOKS[b].left]}・{SYMBOL_NAME[BOOKS[b].right]}
              </span>
            </li>
          ))}
        </ol>
        <Sun />
      </div>
      {ghost && (
        <img className="drag-ghost book-ghost" style={{ left: ghost.x, top: ghost.y }} src={assetUrl(`svg/books/book_${books.order[ghost.payload]}.svg`)} alt="" />
      )}
      {!books.solved && (
        <p className="op-help">{picked === null ? '本をタップして選び、入れ替えたい本をタップする（ドラッグでも入れ替えられる）。' : `${BOOKS[books.order[picked]].name}の本を選んでいる。入れ替える本をタップ。`}</p>
      )}

      <div className={`compartment${books.compartmentOpen ? ' is-open' : ''}${animate ? ' animate-open' : ''}`} aria-label="棚の下の隠し収納">
        {books.compartmentOpen ? (
          cardRevealed(state.progress, 'A') ? (
            <button type="button" className="card-pick" onClick={() => dispatch({ type: 'takeCard', id: 'A' })} aria-label="記録カードAを取る">
              <CardFront id="A" />
              <span className="pick-label">取る</span>
            </button>
          ) : (
            // 任意調査O2（本棚の奥の大きな金具）の接続先。発見と記録は第3段階で実装する
            <div className="compartment-empty" data-optional="O2">
              <svg viewBox="0 0 120 40" aria-hidden="true">
                <rect x="10" y="12" width="100" height="16" rx="3" fill="#6b5330" stroke="#a88a55" strokeWidth="2" />
                <circle cx="22" cy="20" r="3" fill="#2b1d12" />
                <circle cx="98" cy="20" r="3" fill="#2b1d12" />
              </svg>
              <span>収納は空になった。奥に大きな金具が見える。</span>
            </div>
          )
        ) : (
          <span className="compartment-closed">棚の下に、細い継ぎ目がある。</span>
        )}
      </div>
    </>
  );
}
