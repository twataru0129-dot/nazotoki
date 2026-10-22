import { useState } from 'react';
import { assetUrl } from '../game/assets';
import { audio } from '../game/audio';
import { discardSave, exportText, loadSave, restoreBackup } from '../game/save';
import { useGame } from '../game/store';
import { CHAPTER_TITLE, TITLE } from '../game/text';

export function TitleScreen() {
  const { dispatch, saveInfo, refreshSaveInfo } = useGame();
  const [confirmNew, setConfirmNew] = useState(false);
  const [exported, setExported] = useState(false);
  const status = saveInfo.status;
  const hasSave = status === 'ok';

  const startNew = () => {
    audio.unlock();
    // 第1章の保存だけを消す（他の章のデータは別キーなので残る）。壊れていたデータは退避してから消す
    if (status === 'ok' || status === 'corrupt') discardSave(status === 'corrupt');
    refreshSaveInfo();
    dispatch({ type: 'newGame' });
  };

  const continueGame = () => {
    audio.unlock();
    const r = loadSave();
    if (r.status !== 'ok') {
      refreshSaveInfo();
      return;
    }
    dispatch({ type: 'continueGame', progress: r.data.progress, facing: r.data.facing, closeup: r.data.closeup });
  };

  const resumeBackup = () => {
    audio.unlock();
    const data = restoreBackup();
    refreshSaveInfo();
    if (data) dispatch({ type: 'continueGame', progress: data.progress, facing: data.facing, closeup: data.closeup });
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

        {status === 'corrupt' ? (
          // 壊れた保存データ：黙って捨てず、選んでもらう
          <div className="confirm title-confirm" role="alert">
            <p>保存データを正しく読み込めませんでした。</p>
            <div className="title-menu">
              {saveInfo.backup && (
                <button type="button" className="primary-btn" onClick={resumeBackup}>
                  ひとつ前の保存から再開
                </button>
              )}
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  exportText(saveInfo.raw, `study0017-ch1-save-${Date.now()}.json`);
                  setExported(true);
                }}
              >
                読み込めなかったデータを書き出す
              </button>
              <button type="button" className="ghost-btn" onClick={startNew}>
                最初から始める（データは端末内に退避）
              </button>
            </div>
            {exported && <p className="description small">データをファイルとして書き出しました。</p>}
          </div>
        ) : confirmNew ? (
          <div className="confirm title-confirm">
            <p>この端末に保存されている第1章の進行（謎・記録・調査メモ・ヒント・プレイ時間）を消して、最初から始めますか？　設定と他の章の記録は消えません。</p>
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
        {status === 'ok' && saveInfo.migrated && (
          <p className="description small">以前の版の保存データを読み込みました。プレイ時間は 0 から数え直します。</p>
        )}
        {status === 'unavailable' && (
          <p className="title-warn" role="alert">
            このブラウザでは進行を保存できません（プライベートモード等）。遊ぶことはできますが、閉じると最初からになります。
          </p>
        )}
        <p className="title-note">音が出ます。音量は設定で変えられます。進行はこの端末に自動で保存されます。</p>
      </div>
    </main>
  );
}
