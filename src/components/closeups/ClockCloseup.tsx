import { ClockFace, formatTime } from '../art/ClockFace';
import { DevNote } from '../DevNote';

// 書斎Aの時計は 00:17 で止まっている。針と数字は同じ値から描く。
const STOPPED_AT = 17;

export function ClockCloseup() {
  return (
    <>
      <div className="clock-closeup">
        <ClockFace minutes={STOPPED_AT} className="clock-big" />
        <p className="clock-readout" aria-hidden="true">
          {formatTime(STOPPED_AT)}
        </p>
      </div>
      <DevNote>針の操作（ドラッグ・±1分）は第2段階で実装します。</DevNote>
    </>
  );
}
