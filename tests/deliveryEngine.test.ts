import { describe, expect, it } from 'vitest';
import { enrichOffer, rankOffers } from '../shared/deliveryEngine.js';
import type { DeliveryProfile, RawOffer } from '../shared/types.js';

const BASE_PROFILE: DeliveryProfile = {
  postcode: '2000',
  suburb: 'Sydney',
  amazonPrime: true,
  woolworthsUnlimited: false,
  colesPlus: false,
  uberOne: false,
  dashPass: false,
  defaultSort: 'balanced',
};

describe('deliveryEngine', () => {
  it('gives Amazon Prime $0 delivery and same-day arrival before 12pm', () => {
    const offer: RawOffer = {
      retailerId: 'amazon_au',
      retailerName: 'Amazon AU',
      productTitle: 'Fancy Feast Cheddar 12pk',
      packInfo: '12 x 85g',
      itemPrice: 15.0,
      url: 'https://www.amazon.com.au/s?k=fancy+feast+cheddar',
      inStock: true,
      source: 'estimated',
    };

    const morning = new Date(2026, 10, 14, 9, 0, 0);
    const enriched = enrichOffer(offer, BASE_PROFILE, morning, 0);

    expect(enriched.deliveryFee).toBe(0);
    expect(enriched.serviceFee).toBe(0);
    expect(enriched.totalLandedCost).toBe(15.0);
    expect(enriched.isSameDay).toBe(true);
    expect(enriched.earliestArrival).toContain('Today');
  });

  it('includes Uber Eats delivery, service, and small-order fees in total landed cost', () => {
    const offer: RawOffer = {
      retailerId: 'ubereats',
      retailerName: 'Uber Eats',
      productTitle: 'Fancy Feast Cheddar 12pk',
      packInfo: '12 x 85g',
      itemPrice: 19.5,
      url: 'https://www.ubereats.com/au',
      inStock: true,
      source: 'estimated',
    };

    const morning = new Date(2026, 10, 14, 10, 0, 0);
    const enriched = enrichOffer(offer, BASE_PROFILE, morning, 1);

    expect(enriched.deliveryFee).toBe(5.99);
    expect(enriched.serviceFee).toBeGreaterThan(2);
    expect(enriched.totalLandedCost).toBeGreaterThan(27);
    expect(enriched.isSameDay).toBe(true);
    expect(enriched.etaMinutes).toBe(45);
  });

  it('sorts by fastest arrival or cheapest total landed cost when requested', () => {
    const morning = new Date(2026, 10, 14, 9, 0, 0);
    const amazon = enrichOffer(
      {
        retailerId: 'amazon_au',
        retailerName: 'Amazon AU',
        productTitle: 'Fancy Feast Cheddar',
        packInfo: '12pk',
        itemPrice: 15.0,
        url: 'https://amazon.com.au',
        inStock: true,
        source: 'estimated',
      },
      BASE_PROFILE,
      morning,
      0,
    );
    const uber = enrichOffer(
      {
        retailerId: 'ubereats',
        retailerName: 'Uber Eats',
        productTitle: 'Fancy Feast Cheddar',
        packInfo: '12pk',
        itemPrice: 19.5,
        url: 'https://ubereats.com',
        inStock: true,
        source: 'estimated',
      },
      BASE_PROFILE,
      morning,
      1,
    );

    const byFastest = rankOffers([amazon, uber], 'fastest');
    expect(byFastest[0]?.retailerId).toBe('ubereats');

    const byCheapest = rankOffers([amazon, uber], 'cheapest');
    expect(byCheapest[0]?.retailerId).toBe('amazon_au');
  });
});
