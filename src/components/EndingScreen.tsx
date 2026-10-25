import { useState } from 'react';
import { useGame } from '../game/store';
import { DoorTransition } from './DoorTransition';
import { EndingSequence } from './EndingSequence';

// 「先へ進む」→ 扉の演出 → 第1章ラストシーン（約28秒）→ クリア画面。
// スキップはどこからでもクリア処理まで進む。途中で閉じた場合は次回、扉の演出（冒頭）から再生する。
export function EndingScreen() {
  const { dispatch } = useGame();
  const [phase, setPhase] = useState<'door' | 'scenes'>('door');
  const complete = () => dispatch({ type: 'completeEnding' });

  if (phase === 'door') return <DoorTransition footsteps={false} onDone={() => setPhase('scenes')} onSkip={complete} />;
  return <EndingSequence onDone={complete} />;
}
