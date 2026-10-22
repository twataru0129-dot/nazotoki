import { useState } from 'react';
import { audio } from '../game/audio';
import { useGame } from '../game/store';
import { OPENING_AFTER, OPENING_BEFORE } from '../game/text';
import { LetterBack, LetterFront } from './art/Letter';

type Step = 'arrive' | 'letter' | 'enter';

export function OpeningScreen() {
  const { dispatch } = useGame();
  const [step, setStep] = useState<Step>('arrive');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const go = (s: Step) => {
    audio.unlock();
    if (s === 'letter') audio.playSfx('paper_turn', 400);
    setStep(s);
  };

  return (
    <main className="opening" data-step={step}>
      <button type="button" className="skip-btn" onClick={() => dispatch({ type: 'enterStudy' })}>
        スキップ
      </button>
      {step === 'arrive' && (
        <div className="opening-text fade-in" key="arrive">
          {OPENING_BEFORE.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <button type="button" className="primary-btn" onClick={() => go('letter')}>
            手紙を読む
          </button>
        </div>
      )}
      {step === 'letter' && (
        <div className="opening-letter fade-in" key="letter">
          {side === 'front' ? <LetterFront /> : <LetterBack />}
          <div className="confirm-row">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                audio.playSfx('paper_turn', 400);
                setSide(side === 'front' ? 'back' : 'front');
              }}
            >
              {side === 'front' ? '裏返す' : '表に戻す'}
            </button>
            <button type="button" className="primary-btn" onClick={() => go('enter')}>
              書斎へ入る
            </button>
          </div>
        </div>
      )}
      {step === 'enter' && (
        <div className="opening-text fade-in" key="enter">
          {OPENING_AFTER.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <button type="button" className="primary-btn" onClick={() => dispatch({ type: 'enterStudy' })}>
            書斎を調べる
          </button>
        </div>
      )}
    </main>
  );
}
