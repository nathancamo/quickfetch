import type { SearchResponse } from '../types';

interface BotSummaryProps {
  result: SearchResponse;
  onRefresh: () => void;
  loading: boolean;
}

export function BotSummary({ result, onRefresh, loading }: BotSummaryProps) {
  return (
    <section className="bot-summary" aria-label="Bot recommendation">
      <div className="bot-summary-head">
        <span className={`mode-badge ${result.mode === 'live' ? 'live' : 'estimated'}`}>
          {result.mode === 'live' ? 'Live Web Prices' : 'Smart Estimator'}
        </span>
        <button type="button" className="refresh-link" onClick={onRefresh} disabled={loading}>
          {result.cached ? 'Cached · Refresh' : 'Refresh'}
        </button>
      </div>
      <p className="bot-text">{result.summary}</p>
      {result.mode === 'estimated' && (
        <p className="mode-hint">
          Showing built-in AU retailer estimates. Add <code>GEMINI_API_KEY</code> or{' '}
          <code>SERPAPI_KEY</code> in <code>.env</code> for live web prices.
        </p>
      )}
    </section>
  );
}
