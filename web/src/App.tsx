import { useEffect, useState, type FormEvent } from 'react';
import { BotSummary } from './components/BotSummary';
import { OfferCard } from './components/OfferCard';
import { SearchHeader } from './components/SearchHeader';
import { SettingsModal } from './components/SettingsModal';
import {
  fetchHealth,
  fetchProfile,
  fetchRecentSearches,
  saveProfile,
  searchProducts,
} from './lib/api';
import type {
  DeliveryProfile,
  HealthStatus,
  RecentSearch,
  SearchResponse,
  SortMode,
} from './types';

export function App() {
  const [query, setQuery] = useState('fancy feast cheddar');
  const [sort, setSort] = useState<SortMode>('balanced');
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void Promise.all([fetchProfile(), fetchHealth(), fetchRecentSearches()])
      .then(([prof, hlth, rec]) => {
        setProfile(prof);
        setSort(prof.defaultSort);
        setHealth(hlth);
        setRecent(rec.items);
      })
      .catch(() => {
        // Keep UI usable even if initial metadata load fails in isolated tests.
      });
  }, []);

  async function executeSearch(term: string, nextSort: SortMode, refresh = false): Promise<void> {
    const trimmed = term.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const data = await searchProducts(trimmed, nextSort, refresh);
      setResult(data);
      const rec = await fetchRecentSearches();
      setRecent(rec.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    void executeSearch(query, sort);
  }

  function handleSortChange(nextSort: SortMode): void {
    setSort(nextSort);
    if (result) {
      void executeSearch(result.query, nextSort);
    }
  }

  async function handleSaveProfile(patch: Partial<DeliveryProfile>): Promise<void> {
    const updated = await saveProfile(patch);
    setProfile(updated);
    if (result) {
      void executeSearch(result.query, sort, true);
    }
  }

  return (
    <main className="app-shell">
      <SearchHeader
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
        sort={sort}
        onSortChange={handleSortChange}
        profile={profile}
        onOpenSettings={() => setSettingsOpen(true)}
        loading={loading}
      />

      {error && <div className="error-banner">{error}</div>}

      {result ? (
        <>
          <BotSummary
            result={result}
            onRefresh={() => void executeSearch(result.query, sort, true)}
            loading={loading}
          />
          <section className="offers-list" aria-label="Store offers">
            {result.offers.map((offer, idx) => (
              <OfferCard key={offer.id} offer={offer} rank={idx} />
            ))}
          </section>
        </>
      ) : (
        <section className="empty-state">
          <p>
            Tap <strong>Find</strong> to compare item price, delivery fees, service fees, and
            earliest arrival time to your door.
          </p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="recent-box" aria-label="Recent searches">
          <h3>Recent searches</h3>
          <div className="chips-row">
            {recent.map((item) => (
              <button
                key={`${item.query}-${item.postcode}`}
                type="button"
                className="chip"
                onClick={() => {
                  setQuery(item.query);
                  void executeSearch(item.query, sort);
                }}
              >
                {item.query}
                {item.bestPrice !== null ? ` · $${item.bestPrice.toFixed(2)}` : ''}
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsOpen && profile && (
        <SettingsModal
          profile={profile}
          health={health}
          onSave={handleSaveProfile}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
