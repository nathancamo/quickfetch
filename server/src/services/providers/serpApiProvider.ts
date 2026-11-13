import type { RawOffer, RetailerId } from '../../../../shared/types.js';

interface SerpShoppingResult {
  title?: string;
  source?: string;
  extracted_price?: number;
  link?: string;
  product_link?: string;
  delivery?: string;
}

interface SerpApiResponse {
  shopping_results?: SerpShoppingResult[];
}

function mapSourceToRetailer(source: string): RetailerId {
  const s = source.toLowerCase();
  if (s.includes('amazon')) return 'amazon_au';
  if (s.includes('woolworths')) return 'woolworths';
  if (s.includes('coles')) return 'coles';
  if (s.includes('petbarn')) return 'petbarn';
  if (s.includes('petstock')) return 'petstock';
  if (s.includes('uber')) return 'ubereats';
  if (s.includes('doordash')) return 'doordash';
  return 'other';
}

function parseShippingFee(deliveryText: string | undefined): number | undefined {
  if (!deliveryText) return undefined;
  if (/free/i.test(deliveryText)) return 0;
  const match = deliveryText.match(/\$(\d+(?:\.\d{1,2})?)/);
  return match?.[1] ? Number.parseFloat(match[1]) : undefined;
}

export async function searchWithSerpApi(query: string, apiKey: string): Promise<RawOffer[]> {
  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    gl: 'au',
    hl: 'en',
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`SerpAPI failed with status ${res.status}`);
  }

  const data = (await res.json()) as SerpApiResponse;
  const results = data.shopping_results ?? [];

  return results
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && r.title)
    .slice(0, 10)
    .map((r) => ({
      retailerId: mapSourceToRetailer(r.source ?? ''),
      retailerName: r.source ?? 'Store',
      productTitle: r.title ?? query,
      packInfo: 'Listed unit',
      itemPrice: r.extracted_price ?? 0,
      url: r.link ?? r.product_link ?? `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      inStock: true,
      source: 'live-serpapi' as const,
      explicitDeliveryFee: parseShippingFee(r.delivery),
      explicitEtaText: r.delivery,
    }));
}
