import { assetUrl } from '../game/assets';
import { audio } from '../game/audio';
import { useGame } from '../game/store';
import { CHAPTER_TITLE, TITLE } from '../game/text';

export function TitleScreen() {
  const { dispatch } = useGame();
  return (
    <main className="title-screen" onPointerDown={() => audio.unlock()}>
      <img className="title-bg" src={assetUrl('bg/a_north.webp')} alt="" />
      <div className="title-inner">
        <p className="title-time" aria-hidden="true">
          00:17
        </p>
        <h1 className="title-name">{TITLE}</h1>
        <p className="title-chapter">{CHAPTER_TITLE}</p>
        <div className="title-menu">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              audio.unlock();
              dispatch({ type: 'newGame' });
            }}
          >
            はじめから
          </button>
          {/* 「つづきから」はセーブ実装（第3段階）後、セーブがあるときだけ表示する */}
          <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'openOverlay', id: 'settings' })}>
            設定
          </button>
        </div>
        <p className="title-note">音が出ます。音量は設定で変えられます。</p>
      </div>
    </main>
  );
}
