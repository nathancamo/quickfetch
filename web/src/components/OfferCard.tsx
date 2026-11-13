import type { EnrichedOffer } from '../types';

interface OfferCardProps {
  offer: EnrichedOffer;
  rank: number;
}

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function OfferCard({ offer, rank }: OfferCardProps) {
  return (
    <article className={`offer-card ${rank === 0 ? 'top-pick' : ''}`}>
      <div className="offer-top">
        <div className="offer-retailer-group">
          <span className="retailer-name">{offer.retailerName}</span>
          <span className={`eta-badge ${offer.isSameDay ? 'same-day' : 'later'}`}>
            {offer.isSameDay ? 'Same-Day' : offer.fulfillmentType === 'express' ? 'Express' : 'Standard'}
          </span>
        </div>
        <div className="total-price-box">
          <span className="total-label">Total landed</span>
          <span className="total-price">{money(offer.totalLandedCost)}</span>
        </div>
      </div>

      <h2 className="product-title">{offer.productTitle}</h2>
      <p className="pack-info">{offer.packInfo}</p>

      <div className="arrival-row">
        <span className="arrival-label">Earliest to your house:</span>
        <strong className="arrival-time">{offer.earliestArrival}</strong>
      </div>

      <div className="fee-breakdown">
        <span>Item {money(offer.itemPrice)}</span>
        <span>+ Delivery {money(offer.deliveryFee)}</span>
        <span>+ Service {money(offer.serviceFee)}</span>
      </div>
      <p className="fee-notes">{offer.feeNotes}</p>

      <div className="card-actions">
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="open-store-btn"
        >
          Open {offer.retailerName}
        </a>
      </div>
    </article>
  );
}
