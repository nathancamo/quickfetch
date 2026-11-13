import { enrichOffer, rankOffers } from '../../../shared/deliveryEngine.js';
import { searchFallbackCatalog } from '../../../shared/fallbackProvider.js';
import { searchWithGemini } from '../../../shared/geminiProvider.js';
import { buildBotSummary } from '../../../shared/summaryGenerator.js';
import type {
  DeliveryProfile,
  HealthStatus,
  RawOffer,
  RecentSearch,
  SearchResponse,
  SortMode,
} from '../types';

const PROFILE_KEY = 'quickfetch_profile_v1';
const RECENT_KEY = 'quickfetch_recent_v1';
const GEMINI_KEY_STORAGE = 'quickfetch_gemini_api_key';

const DEFAULT_PROFILE: DeliveryProfile = {
  postcode: '2000',
  suburb: 'Sydney',
  amazonPrime: true,
  woolworthsUnlimited: false,
  colesPlus: false,
  uberOne: false,
  dashPass: false,
  defaultSort: 'balanced',
};

const IS_STATIC_BUILD = import.meta.env.VITE_STATIC_MODE === 'true';

export function getBrowserGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setBrowserGeminiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  } catch {
    // Ignore storage errors in restricted contexts.
  }
}

function readLocalProfile(): DeliveryProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<DeliveryProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function writeLocalProfile(patch: Partial<DeliveryProfile>): DeliveryProfile {
  const next = { ...readLocalProfile(), ...patch };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors.
  }
  return next;
}

function readLocalRecent(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch {
    return [];
  }
}

function pushLocalRecent(entry: RecentSearch): void {
  const current = readLocalRecent().filter(
    (item) =>
      !(item.query.toLowerCase() === entry.query.toLowerCase() && item.postcode === entry.postcode),
  );
  const next = [entry, ...current].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors.
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function runClientSearch(query: string, sort: SortMode): Promise<SearchResponse> {
  const profile = readLocalProfile();
  const trimmed = query.trim();
  const now = new Date();
  const geminiKey = getBrowserGeminiKey();

  let rawOffers: RawOffer[] = [];
  let mode: 'live' | 'estimated' = 'estimated';

  if (geminiKey) {
    try {
      const liveOffers = await searchWithGemini(trimmed, profile.postcode, geminiKey);
      if (liveOffers.length > 0) {
        rawOffers = liveOffers;
        mode = 'live';
      }
    } catch {
      // Fall back to estimator if key is invalid or offline.
    }
  }

  if (rawOffers.length === 0) {
    rawOffers = searchFallbackCatalog(trimmed);
  }

  const enriched = rawOffers.map((offer, idx) => enrichOffer(offer, profile, now, idx));
  const ranked = rankOffers(enriched, sort);

  const bestPrice = ranked.length > 0 ? Math.min(...ranked.map((o) => o.totalLandedCost)) : null;
  const fastest = [...ranked].sort((a, b) => a.etaMinutes - b.etaMinutes)[0] ?? null;
  const searchedAt = now.toISOString();

  pushLocalRecent({
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
    cached: false,
    searchedAt,
    summary: buildBotSummary(trimmed, ranked),
    offers: ranked,
  };
}

export async function fetchHealth(): Promise<HealthStatus> {
  if (IS_STATIC_BUILD) {
    return {
      ok: true,
      staticMode: true,
      providers: { gemini: Boolean(getBrowserGeminiKey()), serpApi: false },
    };
  }
  try {
    return await fetchJson<HealthStatus>('/api/health');
  } catch {
    return {
      ok: true,
      staticMode: true,
      providers: { gemini: Boolean(getBrowserGeminiKey()), serpApi: false },
    };
  }
}

export async function fetchProfile(): Promise<DeliveryProfile> {
  if (IS_STATIC_BUILD) return readLocalProfile();
  try {
    return await fetchJson<DeliveryProfile>('/api/profile');
  } catch {
    return readLocalProfile();
  }
}

export async function saveProfile(patch: Partial<DeliveryProfile>): Promise<DeliveryProfile> {
  if (IS_STATIC_BUILD) return writeLocalProfile(patch);
  try {
    return await fetchJson<DeliveryProfile>('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    return writeLocalProfile(patch);
  }
}

export async function searchProducts(
  query: string,
  sort: SortMode,
  refresh = false,
): Promise<SearchResponse> {
  if (IS_STATIC_BUILD) return runClientSearch(query, sort);
  try {
    const params = new URLSearchParams({ q: query, sort });
    if (refresh) params.set('refresh', '1');
    return await fetchJson<SearchResponse>(`/api/search?${params.toString()}`);
  } catch {
    return runClientSearch(query, sort);
  }
}

export async function fetchRecentSearches(): Promise<{ items: RecentSearch[] }> {
  if (IS_STATIC_BUILD) return { items: readLocalRecent() };
  try {
    return await fetchJson<{ items: RecentSearch[] }>('/api/recent');
  } catch {
    return { items: readLocalRecent() };
  }
}
