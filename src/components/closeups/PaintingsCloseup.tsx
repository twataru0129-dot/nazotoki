import { assetUrl } from '../../game/assets';
import { DevNote } from '../DevNote';

// 判定用表示は paintings/painting_*.svg を正とする（生成画像の陰影は使わない）
export function PaintingsCloseup() {
  return (
    <>
      <div className="paintings-grid">
        {(['A', 'B', 'C', 'D'] as const).map((k) => (
          <figure key={k} className="painting-frame">
            <img src={assetUrl(`svg/paintings/painting_${k}.svg`)} alt={`絵画${k}`} draggable={false} />
            <figcaption aria-hidden="true">{k}</figcaption>
          </figure>
        ))}
      </div>
      <DevNote>絵を選んで額を動かす操作は第2段階で実装します。</DevNote>
    </>
  );
}
