import { EndingScreen } from './components/EndingScreen';
import { ExploreScreen } from './components/ExploreScreen';
import { OpeningScreen } from './components/OpeningScreen';
import { OverlayHost } from './components/OverlayHost';
import { TitleScreen } from './components/TitleScreen';
import { useGame } from './game/store';

export function App() {
  const { state } = useGame();
  return (
    <div className="app" data-screen={state.screen}>
      {/* 重ねた画面（モーダル）を開いている間、下の画面は操作・読み上げの対象外 */}
      <div className="screen" inert={state.overlay ? true : undefined} aria-hidden={state.overlay ? true : undefined}>
        {state.screen === 'title' && <TitleScreen />}
        {state.screen === 'opening' && <OpeningScreen />}
        {state.screen === 'explore' && <ExploreScreen />}
        {state.screen === 'ending' && <EndingScreen />}
      </div>
      <OverlayHost />
    </div>
  );
}
