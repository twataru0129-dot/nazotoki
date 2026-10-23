import { OPTIONAL_IDS } from '../game/optional';
import { useGame } from '../game/store';
import { formatDuration } from '../game/time';
import { PUZZLES } from '../game/types';
import { TITLE } from '../game/text';

export function ClearScreen() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const hints = PUZZLES.reduce((n, k) => n + p.hintLevels[k], 0);
  const notes = p.optionalNotes.length;
  return (
    <main className="clear-screen" data-testid="clear-screen">
      <p className="title-time" aria-hidden="true">
        00:14
      </p>
      <h1 className="clear-title">第1章クリア</h1>
      <p className="title-chapter">{TITLE}　第1章「閉ざされた書斎」</p>
      <dl className="clear-stats">
        <div>
          <dt>クリア時間</dt>
          <dd data-testid="clear-time-final">{p.clearSeconds === null ? '記録なし' : formatDuration(p.clearSeconds)}</dd>
        </div>
        <div>
          <dt>解決した謎</dt>
          <dd>5 / 5</dd>
        </div>
        <div>
          <dt>ヒント開示数</dt>
          <dd data-testid="clear-hints">{hints} / 15</dd>
        </div>
        <div>
          <dt>隠し調査メモ</dt>
          <dd data-testid="clear-notes">
            {notes} / {OPTIONAL_IDS.length}
            {notes === OPTIONAL_IDS.length && <span className="badge-inline">称号「観察者」</span>}
          </dd>
        </div>
      </dl>
      <p className="description small">クリア時間は、最後の扉を開けた瞬間で確定しています。</p>
      <div className="title-menu clear-menu">
        <button type="button" className="primary-btn" onClick={() => dispatch({ type: 'startRevisit' })}>
          第1章を再調査
        </button>
        <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'replayEnding' })}>
          エンディングをもう一度見る
        </button>
        <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'toTitle' })}>
          タイトルに戻る
        </button>
        <button type="button" className="ghost-btn" disabled aria-disabled="true">
          第2章（準備中）
        </button>
      </div>
    </main>
  );
}
