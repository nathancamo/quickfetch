import type {
  DeliveryProfile,
  EnrichedOffer,
  FulfillmentType,
  RawOffer,
  SortMode,
} from './types.js';

interface FeeAndEta {
  deliveryFee: number;
  serviceFee: number;
  earliestArrival: string;
  etaMinutes: number;
  isSameDay: boolean;
  fulfillmentType: FulfillmentType;
  feeNotes: string;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeAmazonAu(offer: RawOffer, profile: DeliveryProfile, now: Date): FeeAndEta {
  const hour = now.getHours();
  const beforeSameDayCutoff = hour < 12;

  const deliveryFee =
    offer.explicitDeliveryFee ?? (profile.amazonPrime || offer.itemPrice >= 59 ? 0 : 6.99);
  const serviceFee = offer.explicitServiceFee ?? 0;

  if (profile.amazonPrime && beforeSameDayCutoff) {
    return {
      deliveryFee,
      serviceFee,
      earliestArrival: offer.explicitEtaText ?? 'Today, 5:00 PM – 9:00 PM',
      etaMinutes: Math.max(120, (19 - hour) * 60),
      isSameDay: true,
      fulfillmentType: 'same-day',
      feeNotes: 'Prime Same-Day eligible (order before 12pm)',
    };
  }

  return {
    deliveryFee,
    serviceFee,
    earliestArrival: offer.explicitEtaText ?? 'Tomorrow, 7:00 AM – 12:00 PM',
    etaMinutes: Math.max(360, (24 - hour + 9) * 60),
    isSameDay: false,
    fulfillmentType: 'express',
    feeNotes: profile.amazonPrime
      ? 'Free Prime Next-Day delivery'
      : offer.itemPrice >= 59
        ? 'Free shipping over $59'
        : 'Standard shipping ($6.99 under $59)',
  };
}

function computeSupermarket(
  offer: RawOffer,
  retailer: 'woolworths' | 'coles',
  hasMembership: boolean,
  now: Date,
): FeeAndEta {
  const hour = now.getHours();
  const isRapidWindow = hour >= 7 && hour < 21;
  const label = retailer === 'woolworths' ? 'Woolworths' : 'Coles';
  const membershipName = retailer === 'woolworths' ? 'Delivery Unlimited' : 'Coles Plus';

  if (offer.explicitEtaText?.toLowerCase().includes('now') || retailer === 'woolworths') {
    const rapidDelivery = offer.explicitDeliveryFee ?? 15.0;
    const bagFee = offer.explicitServiceFee ?? 2.0;

    if (isRapidWindow) {
      return {
        deliveryFee: hasMembership && offer.itemPrice >= 50 ? 0 : rapidDelivery,
        serviceFee: bagFee,
        earliestArrival: offer.explicitEtaText ?? 'Today, within 2 hours',
        etaMinutes: 120,
        isSameDay: true,
        fulfillmentType: 'same-day',
        feeNotes:
          hasMembership && offer.itemPrice >= 50
            ? `${membershipName} ($0 delivery over $50) + $${bagFee.toFixed(2)} bag fee`
            : `${label} same-day window + $${bagFee.toFixed(2)} bag/packing fee`,
      };
    }
  }

  const deliveryFee =
    offer.explicitDeliveryFee ?? (hasMembership && offer.itemPrice >= 50 ? 0 : 12.0);
  const serviceFee = offer.explicitServiceFee ?? 1.5;

  return {
    deliveryFee,
    serviceFee,
    earliestArrival:
      offer.explicitEtaText ??
      (hour < 16 ? 'Today, 6:00 PM – 8:00 PM' : 'Tomorrow, 8:00 AM – 10:00 AM'),
    etaMinutes: hour < 16 ? Math.max(120, (18 - hour) * 60) : (24 - hour + 9) * 60,
    isSameDay: hour < 16,
    fulfillmentType: hour < 16 ? 'same-day' : 'standard',
    feeNotes: hasMembership
      ? `${membershipName} requires $50 min for $0 delivery`
      : `${label} standard delivery + $${serviceFee.toFixed(2)} bag fee`,
  };
}

function computePetStore(offer: RawOffer, now: Date): FeeAndEta {
  const hour = now.getHours();
  const sameDayAvailable = hour < 14;
  const deliveryFee =
    offer.explicitDeliveryFee ?? (sameDayAvailable ? 9.95 : offer.itemPrice >= 49 ? 0 : 9.95);
  const serviceFee = offer.explicitServiceFee ?? 0;

  if (sameDayAvailable) {
    return {
      deliveryFee,
      serviceFee,
      earliestArrival: offer.explicitEtaText ?? 'Today, within 3 hours',
      etaMinutes: 180,
      isSameDay: true,
      fulfillmentType: 'same-day',
      feeNotes: 'Same-day local dispatch (order before 2pm)',
    };
  }

  return {
    deliveryFee,
    serviceFee,
    earliestArrival: offer.explicitEtaText ?? '1–3 business days',
    etaMinutes: 48 * 60,
    isSameDay: false,
    fulfillmentType: 'standard',
    feeNotes: offer.itemPrice >= 49 ? 'Free standard shipping over $49' : '$9.95 flat shipping',
  };
}

function computeOnDemandApp(
  offer: RawOffer,
  app: 'ubereats' | 'doordash',
  hasPass: boolean,
  now: Date,
): FeeAndEta {
  const hour = now.getHours();
  const openNow = hour >= 7 && hour < 22;
  const passName = app === 'ubereats' ? 'Uber One' : 'DashPass';

  const baseDelivery = app === 'ubereats' ? 5.99 : 4.99;
  const deliveryFee = offer.explicitDeliveryFee ?? (hasPass ? 0 : baseDelivery);
  // Why: On-demand apps charge a ~12% service fee (capped at $5.99) plus small-order fee under $20.
  const rawService = Math.min(5.99, Math.max(1.99, roundMoney(offer.itemPrice * 0.12)));
  const smallOrderFee = offer.itemPrice < 20 ? 2.5 : 0;
  const serviceFee = offer.explicitServiceFee ?? roundMoney(rawService + smallOrderFee);

  return {
    deliveryFee,
    serviceFee,
    earliestArrival: offer.explicitEtaText ?? (openNow ? 'Today, 35–50 mins' : 'Tomorrow, 7:30 AM'),
    etaMinutes: openNow ? 45 : (24 - hour + 8) * 60,
    isSameDay: openNow,
    fulfillmentType: openNow ? 'same-day' : 'standard',
    feeNotes: hasPass
      ? `${passName} $0 delivery + app service${smallOrderFee > 0 ? ' & small-order' : ''} fee`
      : `Delivery + app service${smallOrderFee > 0 ? ' & small-order' : ''} fee`,
  };
}

function computeFallbackStore(offer: RawOffer): FeeAndEta {
  const deliveryFee = offer.explicitDeliveryFee ?? (offer.itemPrice >= 59 ? 0 : 9.95);
  const serviceFee = offer.explicitServiceFee ?? 0;
  const etaText = offer.explicitEtaText ?? '2–4 business days';
  const isSameDay = etaText.toLowerCase().includes('today');

  return {
    deliveryFee,
    serviceFee,
    earliestArrival: etaText,
    etaMinutes: isSameDay ? 240 : 72 * 60,
    isSameDay,
    fulfillmentType: isSameDay ? 'same-day' : 'standard',
    feeNotes: deliveryFee === 0 ? 'Free delivery' : 'Standard retailer shipping',
  };
}

export function enrichOffer(
  offer: RawOffer,
  profile: DeliveryProfile,
  now: Date = new Date(),
  index = 0,
): EnrichedOffer {
  let calc: FeeAndEta;

  switch (offer.retailerId) {
    case 'amazon_au':
      calc = computeAmazonAu(offer, profile, now);
      break;
    case 'woolworths':
      calc = computeSupermarket(offer, 'woolworths', profile.woolworthsUnlimited, now);
      break;
    case 'coles':
      calc = computeSupermarket(offer, 'coles', profile.colesPlus, now);
      break;
    case 'petbarn':
    case 'petstock':
      calc = computePetStore(offer, now);
      break;
    case 'ubereats':
      calc = computeOnDemandApp(offer, 'ubereats', profile.uberOne, now);
      break;
    case 'doordash':
      calc = computeOnDemandApp(offer, 'doordash', profile.dashPass, now);
      break;
    default:
      calc = computeFallbackStore(offer);
      break;
  }

  const totalLandedCost = roundMoney(offer.itemPrice + calc.deliveryFee + calc.serviceFee);

  return {
    ...offer,
    id: `${offer.retailerId}-${index}`,
    deliveryFee: roundMoney(calc.deliveryFee),
    serviceFee: roundMoney(calc.serviceFee),
    totalLandedCost,
    earliestArrival: calc.earliestArrival,
    etaMinutes: calc.etaMinutes,
    isSameDay: calc.isSameDay,
    fulfillmentType: calc.fulfillmentType,
    feeNotes: calc.feeNotes,
  };
}

export function rankOffers(offers: EnrichedOffer[], sort: SortMode): EnrichedOffer[] {
  return [...offers].sort((a, b) => {
    if (sort === 'fastest') {
      if (a.etaMinutes !== b.etaMinutes) return a.etaMinutes - b.etaMinutes;
      return a.totalLandedCost - b.totalLandedCost;
    }

    if (sort === 'cheapest') {
      if (a.totalLandedCost !== b.totalLandedCost) return a.totalLandedCost - b.totalLandedCost;
      return a.etaMinutes - b.etaMinutes;
    }

    // Why: Balanced mode prioritizes same-day options first, then weighs total landed cost + speed.
    if (a.isSameDay !== b.isSameDay) return a.isSameDay ? -1 : 1;
    const scoreA = a.totalLandedCost + a.etaMinutes / 180;
    const scoreB = b.totalLandedCost + b.etaMinutes / 180;
    return scoreA - scoreB;
  });
}
