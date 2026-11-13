export type SortMode = 'balanced' | 'fastest' | 'cheapest';

export type FulfillmentType = 'same-day' | 'express' | 'standard';

export type RetailerId =
  | 'amazon_au'
  | 'woolworths'
  | 'coles'
  | 'petbarn'
  | 'petstock'
  | 'ubereats'
  | 'doordash'
  | 'other';

export type OfferSource = 'live-gemini' | 'live-serpapi' | 'estimated';

export interface DeliveryProfile {
  postcode: string;
  suburb: string;
  amazonPrime: boolean;
  woolworthsUnlimited: boolean;
  colesPlus: boolean;
  uberOne: boolean;
  dashPass: boolean;
  defaultSort: SortMode;
}

export interface RawOffer {
  retailerId: RetailerId;
  retailerName: string;
  productTitle: string;
  packInfo: string;
  itemPrice: number;
  url: string;
  inStock: boolean;
  source: OfferSource;
  explicitDeliveryFee?: number;
  explicitServiceFee?: number;
  explicitEtaText?: string;
}

export interface EnrichedOffer extends RawOffer {
  id: string;
  deliveryFee: number;
  serviceFee: number;
  totalLandedCost: number;
  earliestArrival: string;
  etaMinutes: number;
  isSameDay: boolean;
  fulfillmentType: FulfillmentType;
  feeNotes: string;
}

export interface SearchResponse {
  query: string;
  postcode: string;
  sort: SortMode;
  mode: 'live' | 'estimated';
  cached: boolean;
  searchedAt: string;
  summary: string;
  offers: EnrichedOffer[];
}

export interface RecentSearch {
  query: string;
  postcode: string;
  searchedAt: string;
  bestPrice: number | null;
  fastestEta: string | null;
}

export interface HealthStatus {
  ok: boolean;
  staticMode?: boolean;
  providers: {
    gemini: boolean;
    serpApi: boolean;
  };
}
