import { useState } from 'react';
import { CARD_IDS, CARDS, type CardId } from '../../game/logic';
import { OPTIONAL_IDS, OPTIONALS } from '../../game/optional';
import { useGame } from '../../game/store';
import { formatDuration } from '../../game/time';
import { PUZZLES } from '../../game/types';
import { CardFront } from '../art/CardFace';
import { LetterBack, LetterFront } from '../art/Letter';

type Tab = 'records' | 'notes' | 'letter';
const TABS: [Tab, string][] = [
  ['records', '記録'],
  ['notes', '調査メモ'],
  ['letter', '手紙'],
];

export function NotebookPanel() {
  const { state, dispatch } = useGame();
  const p = state.progress;
  const [tab, setTab] = useState<Tab>('records');
  const [sort, setSort] = useState<'time' | 'acquired'>('time');
  const [side, setSide] = useState<'front' | 'back'>('front');

  // 記録：一度見た記録は、扉の枠に置いても内容を読める（所持先とは別に表示）
  const found: CardId[] = sort === 'acquired' ? p.acquired : CARD_IDS.filter((id) => p.cards[id].at !== 'unfound').sort((a, b) => CARDS[a].minute - CARDS[b].minute);
  const where = (id: CardId) => {
    const loc = p.cards[id];
    return loc.at === 'slot' ? `所持先：扉の枠${loc.index + 1}` : '所持先：持ち物';
  };
  const hints = PUZZLES.reduce((n, k) => n + p.hintLevels[k], 0);
  const notes = p.optionalNotes;

  return (
    <>
      <dl className="stats">
        <div>
          <dt>プレイ時間</dt>
          <dd data-testid="play-time">{formatDuration(p.playSeconds)}</dd>
        </div>
        {p.door.unlocked && (
          <div>
            <dt>扉を開けた時間</dt>
            <dd data-testid="clear-time">{p.clearSeconds === null ? '記録なし' : formatDuration(p.clearSeconds)}</dd>
          </div>
        )}
        <div>
          <dt>ヒント</dt>
          <dd>{hints} / 15</dd>
        </div>
        <div>
          <dt>調査メモ</dt>
          <dd>{notes.length} / 6</dd>
        </div>
      </dl>

      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'records' && (
          <>
            <div className="record-head">
              <p className="count">集めた記録　{found.length} / 4</p>
              <div className="seg" role="group" aria-label="並べ方">
                <button type="button" aria-pressed={sort === 'time'} onClick={() => setSort('time')}>
                  時刻順
                </button>
                <button type="button" aria-pressed={sort === 'acquired'} onClick={() => setSort('acquired')}>
                  手に入れた順
                </button>
              </div>
            </div>
            {p.chapterCompleted && (
              // 第1章の最後に見たもの。真相は書かない
              <div className="record important" data-testid="record-other-study">
                <span className="note-title">もう一つの書斎</span>
                <span>扉の先の通路を抜けると、最初の書斎とほとんど同じ部屋があった。柱時計は0時14分を指していた。</span>
              </div>
            )}
            <ol className="record-list" data-testid="record-list">
              {found.map((id) => (
                <li key={id} className="record" data-card={id}>
                  <span className="record-card">
                    <CardFront id={id} compact />
                  </span>
                  <span className="record-body">
                    <span className="record-time">
                      {CARDS[id].time}　{CARDS[id].symbol}
                    </span>
                    <span className="record-text">{CARDS[id].text}</span>
                    <span className="record-where">
                      {CARDS[id].source}で発見／{where(id)}
                    </span>
                  </span>
                </li>
              ))}
              {Array.from({ length: 4 - found.length }, (_, n) => (
                <li key={`e${n}`} className="record is-empty">
                  まだ見つけていない記録
                </li>
              ))}
            </ol>
          </>
        )}

        {tab === 'notes' && (
          <>
            <p className="count">調査メモ　{notes.length} / 6</p>
            {notes.length === 0 && <p className="description">まだ書き留めたことはない。部屋の細かいところに、気になる点があるかもしれない。</p>}
            {/* 未発見の項目名は先に並べない（ネタバレ防止）。発見した順に書き留める */}
            <ol className="note-list" data-testid="note-list">
              {notes.map((id) => (
                <li key={id} className="note" data-note={id}>
                  <span className="note-title">{OPTIONALS[id].title}</span>
                  <span>{OPTIONALS[id].note}</span>
                  <span className="note-place">{OPTIONALS[id].place}</span>
                </li>
              ))}
            </ol>
            {notes.length === OPTIONAL_IDS.length && (
              <p className="badge" data-testid="observer-badge">
                称号「観察者」　部屋の違和感をすべて書き留めた。
              </p>
            )}
            {notes.length > 0 && notes.length < OPTIONAL_IDS.length && <p className="description small">気になる点は、ほかにもあるかもしれない。</p>}
          </>
        )}

        {tab === 'letter' && (
          <div className="letter-panel">
            {side === 'front' ? <LetterFront /> : <LetterBack />}
            <div className="confirm-row">
              <button type="button" className="ghost-btn" onClick={() => setSide(side === 'front' ? 'back' : 'front')}>
                {side === 'front' ? '裏返す' : '表に戻す'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => dispatch({ type: 'replayOpening' })}>
                オープニングを見返す
              </button>
            </div>
            {state.monologue && side === 'back' && <p className="monologue inline">{state.monologue}</p>}
          </div>
        )}
      </div>
    </>
  );
}
