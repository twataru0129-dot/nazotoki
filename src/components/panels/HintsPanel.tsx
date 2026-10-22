import { useState } from 'react';
import { useGame } from '../../game/store';
import { HINT_STAGE_LABEL, HINTS, PUZZLE_NAME } from '../../game/text';
import { PUZZLES, type CloseupId, type PuzzleId } from '../../game/types';
import { DevNote } from '../DevNote';

const FROM_CLOSEUP: Partial<Record<CloseupId, PuzzleId>> = {
  bookshelf: 'books',
  paintings: 'paintings',
  desk: 'desk',
  clock: 'clock',
  door: 'door',
};

// ヒントは利用者が明示的に求めたときだけ1段階ずつ開く。第3段階は「答えを見る」。
export function HintsPanel() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState<PuzzleId>((state.closeup && FROM_CLOSEUP[state.closeup]) || 'books');
  const level = state.progress.hintLevels[open];

  return (
    <>
      <div className="tabs hint-tabs" role="tablist" aria-label="謎を選ぶ">
        {PUZZLES.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={open === p} className="tab" onClick={() => setOpen(p)}>
            {PUZZLE_NAME[p]}
          </button>
        ))}
      </div>
      <ol className="hint-list" aria-label={`${PUZZLE_NAME[open]}のヒント`}>
        {HINTS[open].slice(0, level).map((h, i) => (
          <li key={i} className="hint">
            <span className="hint-stage">{`ヒント${i + 1}：${HINT_STAGE_LABEL[i]}`}</span>
            <p>{h}</p>
          </li>
        ))}
      </ol>
      {level < 3 ? (
        <button type="button" className="primary-btn" onClick={() => dispatch({ type: 'revealHint', puzzle: open })}>
          {level === 2 ? '答えを見る' : `ヒント${level + 1}（${HINT_STAGE_LABEL[level as 0 | 1 | 2]}）を見る`}
        </button>
      ) : (
        <p className="description">この謎のヒントはすべて表示した。答えを見ても、謎は自分で解く必要がある。</p>
      )}
      <DevNote>開いたヒントの保存と「次に何を調べる？」の案内は第3段階で実装します。</DevNote>
    </>
  );
}
