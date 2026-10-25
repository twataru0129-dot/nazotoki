import { assetUrl } from '../../game/assets';
import { useGame } from '../../game/store';
import { Examine } from '../Examine';

// 机の上の古い写真（任意調査O1）。写っている人物は1人。右端だけ紙の光沢が違う。
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
        {/* ユーザー提供のセピア写真（scripts/build-photo.mjs で切り出し。802×540、比率はそのまま） */}
        <img src={assetUrl('photo/old_photo.webp')} alt="" width={802} height={540} draggable={false} />
      </button>
      {/* 右端：光沢だけが違う部分 */}
      <Examine id="O1" label="写真の右端を調べる" className="photo-edge">
        <span className="photo-gloss" aria-hidden="true" />
      </Examine>
    </div>
  );
}
