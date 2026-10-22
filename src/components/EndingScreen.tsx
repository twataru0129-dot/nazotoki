import { useGame } from '../game/store';
import { DevNote } from './DevNote';

// 扉の先（通路 → もう一つの書斎 → 時計 00:14 → 第1章 完）は第5段階で実装する。
// ここでは「解錠済みなら先へ進める」という遷移条件だけを用意している。章クリアの記録はしない。
export function EndingScreen() {
  const { dispatch } = useGame();
  return (
    <main className="ending-placeholder">
      <p className="opening-text">扉の向こうには、暗い通路が続いている。</p>
      <DevNote>扉が開く演出、通路、エンディング、クリア画面は第5段階で実装します。</DevNote>
      <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'backToStudy' })}>
        書斎に戻る
      </button>
    </main>
  );
}
