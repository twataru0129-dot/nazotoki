import { useEffect, useState } from 'react';
import { audio } from '../game/audio';
import { useGame } from '../game/store';
import { DevNote } from './DevNote';
import { DoorTransition } from './DoorTransition';

// 「先へ進む」→ 扉の演出（第4段階で制作）→ エンディング本編（第5段階で実装）。
// 章クリアの記録はまだしない。
export function EndingScreen() {
  const { dispatch } = useGame();
  const [phase, setPhase] = useState<'door' | 'after'>('door');

  useEffect(() => {
    if (phase !== 'after') return;
    // 扉をくぐった後の演出曲（28秒のタイムラインへの配置は第5段階）
    audio.setBgm('reveal');
  }, [phase]);

  if (phase === 'door') return <DoorTransition onDone={() => setPhase('after')} />;
  return (
    <main className="ending-placeholder">
      <p className="opening-text">扉の向こうには、暗い通路が続いている。</p>
      <DevNote>通路から先（もう一つの書斎・時計・第1章 完）とクリア画面は第5段階で実装します。</DevNote>
      <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'backToStudy' })}>
        書斎に戻る
      </button>
    </main>
  );
}
