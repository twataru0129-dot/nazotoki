import type { CSSProperties } from 'react';
import { assetUrl } from '../game/assets';
import { BOOK_INITIAL, CLOCK_SOLUTION, CLOCK_STOPPED, type BookId } from '../game/logic';
import { rectToPercent } from '../game/geometry';
import { DECOR, OVERLAYS } from '../game/scenes';
import type { Rect } from '../game/types';
import { BookArt } from './art/BookArt';
import { ClockFace } from './art/ClockFace';
import { PhotoFrame } from './art/PhotoFrame';

const place = (r: Rect): CSSProperties => {
  const p = rectToPercent(r);
  return { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` };
};

/** 北の壁の重ね表示：空き棚に並ぶ本と、机上の写真立て。
 *  書斎Aは操作用の4冊（現在の並び）。書斎Bは同じ構図に赤い本と、人物が1人多い写真（第5段階のエンディングで使う）。 */
export function NorthDecor({ room, order = BOOK_INITIAL }: { room: 'A' | 'B'; order?: BookId[] }) {
  const books: (BookId | 'red')[] = room === 'A' ? order : ['green', 'black', 'red', 'ivory', 'blue'];
  const slot = DECOR.northBooks;
  const n = books.length;
  const gap = 2;
  const w = (slot.w - gap * (n - 1)) / n;
  return (
    <>
      {books.map((b, i) => (
        <div
          key={`${b}-${i}`}
          className="stage-overlay scene-book"
          data-scene-book={b}
          style={place({ x: slot.x + i * (w + gap), y: slot.y, w, h: slot.h })}
        >
          <BookArt id={b} className="fill" stretch />
        </div>
      ))}
      <div className="stage-overlay" style={place(DECOR.deskPhoto)} data-scene-photo={room}>
        <PhotoFrame room={room} className="fill" />
      </div>
    </>
  );
}

/** 書斎の1面を描く再利用部品（第5段階のエンディングで書斎Bを見せるために使う）。
 *  A/B は同じ背景画像・同じ時計本体を使い、違いは「赤い本」「写真の人物」「時計の時刻（A 00:17／B 00:14）」だけ。 */
export function RoomView({ room, facing, className }: { room: 'A' | 'B'; facing: 'north' | 'east'; className?: string }) {
  return (
    <div className={`room-view ${className ?? ''}`} data-room={room} data-facing={facing}>
      <img className="stage-bg" src={assetUrl(facing === 'north' ? 'bg/a_north.webp' : 'bg/a_east.webp')} alt="" draggable={false} />
      {facing === 'north' && <NorthDecor room={room} />}
      {facing === 'east' && (
        <div className="stage-overlay" style={place(OVERLAYS.clockFace)}>
          <ClockFace minutes={room === 'A' ? CLOCK_STOPPED : CLOCK_SOLUTION} className="fill" />
        </div>
      )}
    </div>
  );
}
