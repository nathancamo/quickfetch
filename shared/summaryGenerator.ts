import type { EnrichedOffer } from './types.js';

export function buildBotSummary(query: string, offers: EnrichedOffer[]): string {
  if (offers.length === 0) {
    return `No offers found for "${query}". Try a broader product name.`;
  }

  const cheapest = [...offers].sort((a, b) => a.totalLandedCost - b.totalLandedCost)[0];
  const fastest = [...offers].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];
  const sameDayCheapest = [...offers]
    .filter((o) => o.isSameDay)
    .sort((a, b) => a.totalLandedCost - b.totalLandedCost)[0];

  if (!cheapest || !fastest) return '';

  const parts: string[] = [];

  if (sameDayCheapest) {
    parts.push(
      `Best same-day value: ${sameDayCheapest.retailerName} at $${sameDayCheapest.totalLandedCost.toFixed(2)} total (${sameDayCheapest.earliestArrival}).`,
    );
  }

  if (fastest.id !== sameDayCheapest?.id) {
    parts.push(
      `Fastest arrival: ${fastest.retailerName} (${fastest.earliestArrival}) for $${fastest.totalLandedCost.toFixed(2)} total.`,
    );
  }

  if (cheapest.id !== sameDayCheapest?.id && cheapest.id !== fastest.id) {
    parts.push(
      `Cheapest overall: ${cheapest.retailerName} at $${cheapest.totalLandedCost.toFixed(2)} total (${cheapest.earliestArrival}).`,
    );
  }

  return parts.join(' ');
}
