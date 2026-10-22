import { useState } from 'react';
import { useGame } from '../../game/store';
import { HINT_STAGE_LABEL, HINTS, PUZZLE_NAME } from '../../game/text';
import { PUZZLES, type CloseupId, type PuzzleId } from '../../game/types';
import { explorationGuide } from '../../game/guide';

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
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <section className="guide" aria-label="次に何を調べる？">
        <h3 className="sub-head">次に何を調べる？</h3>
        {guideOpen ? (
          <ul className="guide-list" data-testid="guide">
            {explorationGuide(state.progress).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : (
          <button type="button" className="ghost-btn wide" onClick={() => setGuideOpen(true)}>
            探索の手がかりを見る（謎の答えは出ない）
          </button>
        )}
      </section>
      <h3 className="sub-head">謎のヒント</h3>
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
      <p className="description small">開いたヒントは手帳とともに保存され、何度でも読み返せる。ヒントを使っても減点はない。</p>
    </>
  );
}
