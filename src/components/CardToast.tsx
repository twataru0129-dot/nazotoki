import { useGame } from '../game/store';
import { useFreshFx } from '../game/useFreshFx';
import { CardFront } from './art/CardFace';

/** カード獲得の演出（約0.5秒）：取ったカードが浮かび上がり、持ち物へ吸い込まれる */
export function CardToast() {
  const { state } = useGame();
  const a = useFreshFx('card-take', 'toast');
  const d = useFreshFx('card-take-D', 'toast-D');
  const id = state.progress.acquired.at(-1);
  if (!(a || d) || !id) return null;
  return (
    <div key={state.fx?.n} className="card-toast" aria-hidden="true" data-testid="card-toast">
      <CardFront id={id} compact />
    </div>
  );
}
