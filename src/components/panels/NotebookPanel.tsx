import { useState } from 'react';
import { CARD_IDS, CARDS } from '../../game/logic';
import { useGame } from '../../game/store';
import { LetterFront } from '../art/Letter';
import { DevNote } from '../DevNote';

type Tab = 'records' | 'notes' | 'letter';
const TABS: [Tab, string][] = [
  ['records', '記録'],
  ['notes', '調査メモ'],
  ['letter', '手紙'],
];

export function NotebookPanel() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>('records');
  // 時刻順。扉の枠に置いたカードも内容は読める（所持先とは別）
  const found = CARD_IDS.filter((id) => state.progress.cards[id].at !== 'unfound').sort((a, b) => CARDS[a].minute - CARDS[b].minute);
  return (
    <>
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
            <p className="count">集めた記録　{found.length} / 4（時刻順）</p>
            <ul className="record-list">
              {found.map((id) => (
                <li key={id} className="record">
                  <span className="record-time">{CARDS[id].time}</span>
                  <span className="record-symbol">{CARDS[id].symbol}</span>
                  <span>{CARDS[id].text}</span>
                </li>
              ))}
              {Array.from({ length: 4 - found.length }, (_, n) => (
                <li key={`e${n}`} className="record is-empty">
                  まだ見つけていない記録
                </li>
              ))}
            </ul>
            <DevNote>取得順での表示と記録画面の仕上げは第3段階で行います。</DevNote>
          </>
        )}
        {tab === 'notes' && (
          <>
            <p className="count">調査メモ　0 / 6</p>
            <p className="description">まだ書き留めたことはない。</p>
            <DevNote>任意調査メモの記録は第3段階で実装します。</DevNote>
          </>
        )}
        {tab === 'letter' && <LetterFront />}
      </div>
    </>
  );
}
