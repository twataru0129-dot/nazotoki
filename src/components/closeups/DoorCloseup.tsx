import { formatTime } from '../art/ClockFace';
import { DoorDevice } from '../art/DoorDevice';
import { DevNote } from '../DevNote';

export function DoorCloseup() {
  return (
    <>
      <DoorDevice dialMinutes={17} className="door-device" />
      <p className="dial-readout">ダイヤル　{formatTime(17)}</p>
      <p className="description">カードを差し込む枠が横一列に4つ。上には時刻を合わせるダイヤルがある。扉は固く施錠されている。</p>
      <DevNote>カードの配置・ダイヤル操作・解錠は第2段階で実装します。</DevNote>
    </>
  );
}
