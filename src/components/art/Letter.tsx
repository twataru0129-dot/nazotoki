import { Examine } from '../Examine';
import { LETTER_LINES, LETTER_TIME } from '../../game/text';

export function LetterFront() {
  return (
    <div className="letter-paper" aria-label="城戸透の手紙（表）">
      {LETTER_LINES.map((l) => (
        <p key={l}>{l}</p>
      ))}
      <p className="letter-time">{LETTER_TIME}</p>
    </div>
  );
}

/** 裏面。薄い二本の跡（任意調査O6） */
export function LetterBack() {
  return (
    <div className="letter-paper letter-back" aria-label="城戸透の手紙（裏）">
      <Examine id="O6" label="手紙の裏の跡を調べる" className="letter-marks-btn">
        <svg className="letter-marks" viewBox="0 0 300 200" aria-hidden="true">
          <path d="M40 92 C 110 88, 190 95, 262 90" stroke="#7d6a4c" strokeOpacity=".22" strokeWidth="2" fill="none" />
          <path d="M40 106 C 110 102, 190 109, 262 104" stroke="#7d6a4c" strokeOpacity=".22" strokeWidth="2" fill="none" />
        </svg>
      </Examine>
    </div>
  );
}
