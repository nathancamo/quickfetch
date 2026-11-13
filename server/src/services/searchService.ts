import type Database from 'better-sqlite3';
import {
  getCachedOffers,
  getProfile,
  recordRecentSearch,
  saveCachedOffers,
} from '../db.js';
import type { RawOffer, SearchResponse, SortMode } from '../../../shared/types.js';
import { enrichOffer, rankOffers } from '../../../shared/deliveryEngine.js';
import { searchFallbackCatalog } from '../../../shared/fallbackProvider.js';
import { searchWithGemini } from '../../../shared/geminiProvider.js';
import { buildBotSummary } from '../../../shared/summaryGenerator.js';
import { searchWithSerpApi } from './providers/serpApiProvider.js';

export interface ProviderKeys {
  geminiApiKey?: string;
  serpApiKey?: string;
}

async function fetchLiveOffers(
  query: string,
  postcode: string,
  keys: ProviderKeys,
): Promise<{ offers: RawOffer[]; mode: 'live' | 'estimated' }> {
  if (keys.serpApiKey) {
    try {
      const serpOffers = await searchWithSerpApi(query, keys.serpApiKey);
      if (serpOffers.length > 0) {
        return { offers: serpOffers, mode: 'live' };
      }
    } catch {
      // Fall through to Gemini or estimator if SerpAPI fails or times out.
    }
  }

  if (keys.geminiApiKey) {
    try {
      const geminiOffers = await searchWithGemini(query, postcode, keys.geminiApiKey);
      if (geminiOffers.length > 0) {
        return { offers: geminiOffers, mode: 'live' };
      }
    } catch {
      // Fall through to estimator if Gemini API fails or times out.
    }
  }

  return { offers: searchFallbackCatalog(query), mode: 'estimated' };
}

export async function runSearch(
  db: Database.Database,
  query: string,
  sortOverride?: SortMode,
  forceRefresh = false,
  keys: ProviderKeys = {},
): Promise<SearchResponse> {
  const profile = getProfile(db);
  const sort = sortOverride ?? profile.defaultSort;
  const trimmed = query.trim();
  const now = new Date();

  let rawOffers: RawOffer[];
  let mode: 'live' | 'estimated';
  let cached = false;

  const cachedEntry = forceRefresh ? null : getCachedOffers(db, trimmed, profile.postcode);
  if (cachedEntry) {
    rawOffers = cachedEntry.offers;
    mode = cachedEntry.mode;
    cached = true;
  } else {
    const fetched = await fetchLiveOffers(trimmed, profile.postcode, keys);
    rawOffers = fetched.offers;
    mode = fetched.mode;
    saveCachedOffers(db, trimmed, profile.postcode, mode, rawOffers);
  }

  const enriched = rawOffers.map((offer, idx) => enrichOffer(offer, profile, now, idx));
  const ranked = rankOffers(enriched, sort);

  const bestPrice =
    ranked.length > 0 ? Math.min(...ranked.map((o) => o.totalLandedCost)) : null;
  const fastest = [...ranked].sort((a, b) => a.etaMinutes - b.etaMinutes)[0] ?? null;

  const searchedAt = now.toISOString();
  recordRecentSearch(db, {
    query: trimmed,
    postcode: profile.postcode,
    bestPrice,
    fastestEta: fastest?.earliestArrival ?? null,
    searchedAt,
  });

  return {
    query: trimmed,
    postcode: profile.postcode,
    sort,
    mode,
    cached,
    searchedAt,
    summary: buildBotSummary(trimmed, ranked),
    offers: ranked,
  };
}
