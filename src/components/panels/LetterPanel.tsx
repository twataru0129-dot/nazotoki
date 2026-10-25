import { useState } from 'react';
import { audio } from '../../game/audio';
import { useGame } from '../../game/store';
import { LETTER_BACK } from '../../game/text';
import { LetterBack, LetterFront } from '../art/Letter';

export function LetterPanel() {
  const { state } = useGame();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const flip = () => {
    audio.playSfx('paper_turn', 400);
    setSide((s) => (s === 'front' ? 'back' : 'front'));
  };
  return (
    <div className="letter-panel">
      {side === 'front' ? <LetterFront /> : <LetterBack />}
      {side === 'back' && <p className="description">{LETTER_BACK}</p>}
      {side === 'back' && state.monologue && <p className="monologue inline">{state.monologue}</p>}
      <button type="button" className="primary-btn" onClick={flip}>
        {side === 'front' ? '裏返す' : '表に戻す'}
      </button>
    </div>
  );
}
