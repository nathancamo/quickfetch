import type { RawOffer, RetailerId } from './types.js';

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface ParsedGeminiOffer {
  retailerId?: string;
  retailerName?: string;
  productTitle?: string;
  packInfo?: string;
  itemPrice?: number;
  url?: string;
  explicitDeliveryFee?: number;
  explicitEtaText?: string;
}

const VALID_RETAILERS = new Set<RetailerId>([
  'amazon_au',
  'woolworths',
  'coles',
  'petbarn',
  'petstock',
  'ubereats',
  'doordash',
  'other',
]);

function normalizeRetailerId(raw: string | undefined): RetailerId {
  if (raw && VALID_RETAILERS.has(raw as RetailerId)) {
    return raw as RetailerId;
  }
  return 'other';
}

function extractJsonArray(text: string): ParsedGeminiOffer[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed: unknown = JSON.parse(match[0]);
  return Array.isArray(parsed) ? (parsed as ParsedGeminiOffer[]) : [];
}

export async function searchWithGemini(
  query: string,
  postcode: string,
  apiKey: string,
): Promise<RawOffer[]> {
  const prompt = [
    `Search Australian online retailers (Amazon AU, Woolworths, Coles, Petbarn, Petstock, Big W, etc.) for "${query}" deliverable to postcode ${postcode}.`,
    `Return ONLY a JSON array of 4 to 7 offers with fields:`,
    `retailerId (one of: amazon_au, woolworths, coles, petbarn, petstock, ubereats, doordash, other),`,
    `retailerName, productTitle, packInfo, itemPrice (number in AUD), url (direct store or search URL),`,
    `explicitDeliveryFee (number or omit if unknown), explicitEtaText (e.g. "Today 5-9pm" or omit).`,
  ].join(' ');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Gemini API failed with status ${res.status}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n') ?? '';
  const items = extractJsonArray(text);

  return items
    .filter((item) => typeof item.itemPrice === 'number' && item.itemPrice > 0 && item.productTitle)
    .map((item) => ({
      retailerId: normalizeRetailerId(item.retailerId),
      retailerName: item.retailerName ?? 'Retailer',
      productTitle: item.productTitle ?? query,
      packInfo: item.packInfo ?? 'Standard pack',
      itemPrice: item.itemPrice ?? 0,
      url: item.url ?? `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      inStock: true,
      source: 'live-gemini' as const,
      explicitDeliveryFee:
        typeof item.explicitDeliveryFee === 'number' ? item.explicitDeliveryFee : undefined,
      explicitEtaText: item.explicitEtaText,
    }));
}
