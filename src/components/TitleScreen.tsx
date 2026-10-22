import { useState } from 'react';
import { assetUrl } from '../game/assets';
import { audio } from '../game/audio';
import { discardSave, loadSave } from '../game/save';
import { useGame } from '../game/store';
import { CHAPTER_TITLE, TITLE } from '../game/text';

export function TitleScreen() {
  const { dispatch, saveStatus, refreshSaveStatus } = useGame();
  const [confirmNew, setConfirmNew] = useState(false);
  const hasSave = saveStatus === 'ok';

  const startNew = () => {
    audio.unlock();
    // 第1章の保存だけを消す（他の章のデータは別キーなので残る）。壊れていたデータは退避してから消す
    if (saveStatus === 'ok' || saveStatus === 'corrupt') discardSave(saveStatus === 'corrupt');
    refreshSaveStatus();
    dispatch({ type: 'newGame' });
  };

  const continueGame = () => {
    audio.unlock();
    const r = loadSave();
    if (r.status !== 'ok') {
      refreshSaveStatus();
      return;
    }
    dispatch({ type: 'continueGame', progress: r.data.progress, facing: r.data.facing, closeup: r.data.closeup });
  };

  return (
    <main className="title-screen" onPointerDown={() => audio.unlock()}>
      <img className="title-bg" src={assetUrl('bg/a_north.webp')} alt="" />
      <div className="title-inner">
        <p className="title-time" aria-hidden="true">
          00:17
        </p>
        <h1 className="title-name">{TITLE}</h1>
        <p className="title-chapter">{CHAPTER_TITLE}</p>
        {confirmNew ? (
          <div className="confirm title-confirm">
            <p>この端末に保存されている第1章の進行を消して、最初から始めますか？</p>
            <div className="confirm-row">
              <button type="button" className="ghost-btn" onClick={() => setConfirmNew(false)}>
                やめる
              </button>
              <button type="button" className="primary-btn" onClick={startNew}>
                最初から始める
              </button>
            </div>
          </div>
        ) : (
          <div className="title-menu">
            {hasSave && (
              <button type="button" className="primary-btn" onClick={continueGame}>
                つづきから
              </button>
            )}
            <button type="button" className={hasSave ? 'ghost-btn' : 'primary-btn'} onClick={() => (hasSave ? setConfirmNew(true) : startNew())}>
              はじめから
            </button>
            <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'openOverlay', id: 'settings' })}>
              設定
            </button>
          </div>
        )}
        {saveStatus === 'corrupt' && (
          <p className="title-warn" role="alert">
            保存データを正しく読み込めなかったため、つづきからは選べません。はじめから始めると、読み込めなかったデータは別の場所に退避されます。
          </p>
        )}
        {saveStatus === 'unavailable' && (
          <p className="title-warn" role="alert">
            このブラウザでは進行を保存できません（プライベートモード等）。遊ぶことはできますが、閉じると最初からになります。
          </p>
        )}
        <p className="title-note">音が出ます。音量は設定で変えられます。進行はこの端末に自動で保存されます。</p>
      </div>
    </main>
  );
}
