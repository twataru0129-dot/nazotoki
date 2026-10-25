import type { ReactNode } from 'react';

/** 開発中の表示。未実装の機能を「完成」と見せないための注記（完成時に撤去する） */
export function DevNote({ children }: { children: ReactNode }) {
  return (
    <p className="dev-note" role="note">
      <span className="dev-note-tag">開発中</span>
      {children}
    </p>
  );
}
