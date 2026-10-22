import { assetUrl } from '../../game/assets';

// 東面の背景から窓の部分だけを拡大表示する（同じ画像なので外の景色は一致する）
export function WindowCloseup() {
  return (
    <div
      className="window-view"
      role="img"
      aria-label="雨の降る夜の庭。暗い木立の向こうに小さな灯り"
      style={{ backgroundImage: `url(${assetUrl('bg/a_east.webp')})` }}
    />
  );
}
