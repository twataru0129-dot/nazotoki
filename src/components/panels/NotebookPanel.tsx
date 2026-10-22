import { useState } from 'react';
import { LetterFront } from '../art/Letter';
import { DevNote } from '../DevNote';

type Tab = 'records' | 'notes' | 'letter';
const TABS: [Tab, string][] = [
  ['records', '記録'],
  ['notes', '調査メモ'],
  ['letter', '手紙'],
];

export function NotebookPanel() {
  const [tab, setTab] = useState<Tab>('records');
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
            <p className="count">集めた記録　0 / 4</p>
            <ul className="record-list">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="record is-empty">
                  まだ見つけていない記録
                </li>
              ))}
            </ul>
            <DevNote>記録の内容表示と時刻順の並べ替えは、カード入手（第2段階）と合わせて実装します。</DevNote>
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
