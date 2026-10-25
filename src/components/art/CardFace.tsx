import { assetUrl } from '../../game/assets';
import { CARDS, type CardId } from '../../game/logic';

/** 記録カードの表。文字・記号はDOMで描く（画像生成の文字は使わない） */
export function CardFront({ id, compact = false }: { id: CardId; compact?: boolean }) {
  const c = CARDS[id];
  return (
    <span className={`card-face card-front${compact ? ' is-compact' : ''}`} role="img" aria-label={`記録カード${id}　${c.time} ${c.symbol} ${c.text}`}>
      <span className="card-symbol" aria-hidden="true">
        {c.symbol}
      </span>
      <span className="card-time" aria-hidden="true">
        {c.time}
      </span>
      {!compact && (
        <span className="card-text" aria-hidden="true">
          {c.text}
        </span>
      )}
    </span>
  );
}

/** 裏面（見取り図の一部）。扉の正解演出まで表示しない */
export function CardBack({ id }: { id: CardId }) {
  return <img className="card-face card-back" src={assetUrl(`svg/cards/card_${id}_back.svg`)} alt="" draggable={false} />;
}
