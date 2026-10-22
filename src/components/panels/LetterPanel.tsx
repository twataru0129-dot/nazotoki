import { useState } from 'react';
import { audio } from '../../game/audio';
import { LETTER_BACK } from '../../game/text';
import { LetterBack, LetterFront } from '../art/Letter';

export function LetterPanel() {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const flip = () => {
    audio.playSfx('paper_turn', 400);
    setSide((s) => (s === 'front' ? 'back' : 'front'));
  };
  return (
    <div className="letter-panel">
      {side === 'front' ? <LetterFront /> : <LetterBack />}
      {side === 'back' && <p className="description">{LETTER_BACK}</p>}
      <button type="button" className="primary-btn" onClick={flip}>
        {side === 'front' ? '裏返す' : '表に戻す'}
      </button>
    </div>
  );
}
