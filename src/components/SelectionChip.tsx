import { CARDS } from '../game/logic';
import { useGame } from '../game/store';

/** 持ち物を選んでいるときの表示。どの画面からでも解除できる */
export function SelectionChip() {
  const { state, dispatch } = useGame();
  const sel = state.selected;
  if (!sel) return null;
  const name = sel.kind === 'key' ? '小さな鍵' : `記録カード${sel.id}（${CARDS[sel.id].time} ${CARDS[sel.id].symbol}）`;
  return (
    <div className="selection-chip" role="status">
      <span>選択中：{name}</span>
      <button type="button" className="ghost-btn small" onClick={() => dispatch({ type: 'select', item: null })}>
        解除
      </button>
    </div>
  );
}
