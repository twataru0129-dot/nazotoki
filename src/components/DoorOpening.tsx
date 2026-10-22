import { assetUrl } from '../game/assets';
import { useFreshFx } from '../game/useFreshFx';

/** 解錠の直後に一度だけ：閉じた扉の画像を重ね、1.8秒かけて消して開いた扉を見せる（約7秒の解錠演出の最後） */
export function DoorOpening() {
  const fresh = useFreshFx('door-solved', 'scene-door-opening');
  if (!fresh) return null;
  return <img className="door-opening-veil" src={assetUrl('bg/a_south_closed.webp')} alt="" aria-hidden="true" />;
}
