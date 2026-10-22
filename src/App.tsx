import { EndingScreen } from './components/EndingScreen';
import { ExploreScreen } from './components/ExploreScreen';
import { OpeningScreen } from './components/OpeningScreen';
import { CardToast } from './components/CardToast';
import { OverlayHost } from './components/OverlayHost';
import { TitleScreen } from './components/TitleScreen';
import { useGame } from './game/store';

export function App() {
  const { state, saveFailed } = useGame();
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
      {state.screen === 'explore' && <CardToast />}
      {/* 4枚目の記録がそろった瞬間の「静寂」（画面を一瞬暗くする。音を出さない設定でも分かるように） */}
      {state.fx?.key.split('|').includes('silence') && <div key={state.fx.n} className="silence-veil" aria-hidden="true" />}
      {state.screen === 'explore' && saveFailed && (
        <p className="save-failed" role="status">
          進行を保存できませんでした（ブラウザの保存領域が使えない可能性があります）。遊び続けることはできます。
        </p>
      )}
    </div>
  );
}
