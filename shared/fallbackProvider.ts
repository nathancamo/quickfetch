import type { RawOffer } from './types.js';

function fancyFeastCheddarOffers(query: string): RawOffer[] {
  const encoded = encodeURIComponent(query);
  return [
    {
      retailerId: 'amazon_au',
      retailerName: 'Amazon AU',
      productTitle: 'Fancy Feast Inspirations Cheddar & Tuna Wet Cat Food 85g (12 Pack)',
      packInfo: '12 x 85g ($1.25/can)',
      itemPrice: 15.0,
      url: `https://www.amazon.com.au/s?k=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'woolworths',
      retailerName: 'Woolworths (Delivery Now)',
      productTitle: 'Fancy Feast Puree / Inspirations Cheddar Cat Food 12 Pack',
      packInfo: '12 x 85g ($1.50/can)',
      itemPrice: 18.0,
      url: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'coles',
      retailerName: 'Coles',
      productTitle: 'Fancy Feast Cheddar & Tuna / Chicken Wet Cat Food 12 Pack',
      packInfo: '12 x 85g ($1.45/can)',
      itemPrice: 17.4,
      url: `https://www.coles.com.au/search?q=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'petbarn',
      retailerName: 'Petbarn',
      productTitle: 'Fancy Feast Cheddar Delights Wet Cat Food 85g (Case of 24)',
      packInfo: '24 x 85g ($1.33/can)',
      itemPrice: 31.9,
      url: `https://www.petbarn.com.au/search?q=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'ubereats',
      retailerName: 'Uber Eats (Coles / Petbarn)',
      productTitle: 'Fancy Feast Cheddar Wet Cat Food 12 Pack',
      packInfo: '12 x 85g (Local courier)',
      itemPrice: 19.5,
      url: `https://www.ubereats.com/au/search?q=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'doordash',
      retailerName: 'DoorDash (Local Supermarket)',
      productTitle: 'Fancy Feast Cheddar Wet Cat Food 12 Pack',
      packInfo: '12 x 85g (Local courier)',
      itemPrice: 19.0,
      url: `https://www.doordash.com/search/store/${encoded}/`,
      inStock: true,
      source: 'estimated',
    },
  ];
}

function genericFallbackOffers(query: string): RawOffer[] {
  const encoded = encodeURIComponent(query);
  // Why: Deterministic price variation based on query length gives consistent estimates across refreshes.
  const base = 18 + (query.length % 15);
  return [
    {
      retailerId: 'amazon_au',
      retailerName: 'Amazon AU',
      productTitle: `${query} — Amazon AU Top Match`,
      packInfo: 'Standard pack',
      itemPrice: base,
      url: `https://www.amazon.com.au/s?k=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'woolworths',
      retailerName: 'Woolworths',
      productTitle: `${query} — Woolworths Online`,
      packInfo: 'Standard pack',
      itemPrice: base + 2.5,
      url: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'coles',
      retailerName: 'Coles',
      productTitle: `${query} — Coles Online`,
      packInfo: 'Standard pack',
      itemPrice: base + 1.9,
      url: `https://www.coles.com.au/search?q=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'ubereats',
      retailerName: 'Uber Eats (Local Store)',
      productTitle: `${query} — Local Express`,
      packInfo: 'On-demand courier',
      itemPrice: base + 4.0,
      url: `https://www.ubereats.com/au/search?q=${encoded}`,
      inStock: true,
      source: 'estimated',
    },
    {
      retailerId: 'doordash',
      retailerName: 'DoorDash (Local Store)',
      productTitle: `${query} — Local Express`,
      packInfo: 'On-demand courier',
      itemPrice: base + 3.5,
      url: `https://www.doordash.com/search/store/${encoded}/`,
      inStock: true,
      source: 'estimated',
    },
  ];
}

export function searchFallbackCatalog(query: string): RawOffer[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.includes('fancy feast') || normalized.includes('cheddar')) {
    return fancyFeastCheddarOffers(query);
  }
  return genericFallbackOffers(query);
}
