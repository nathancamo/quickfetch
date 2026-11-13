import type { FormEvent } from 'react';
import type { DeliveryProfile, SortMode } from '../types';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  profile: DeliveryProfile | null;
  onOpenSettings: () => void;
  loading: boolean;
}

const QUICK_CHIPS = [
  'fancy feast cheddar',
  'cat litter 10kg',
  'coca cola 24 pack',
  'laundry liquid 2l',
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'balanced', label: 'Best Match' },
  { value: 'fastest', label: 'Fastest (Same-Day)' },
  { value: 'cheapest', label: 'Cheapest Total' },
];

export function SearchHeader({
  query,
  onQueryChange,
  onSubmit,
  sort,
  onSortChange,
  profile,
  onOpenSettings,
  loading,
}: SearchHeaderProps) {
  return (
    <header className="header">
      <div className="header-top">
        <div>
          <h1 className="brand">QuickFetch</h1>
          <p className="subtitle">
            {profile ? `Delivering to ${profile.suburb} (${profile.postcode})` : 'Loading location...'}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Delivery settings">
          Settings
        </button>
      </div>

      <form className="search-form" onSubmit={onSubmit}>
        <input
          type="search"
          className="search-input"
          placeholder="Search e.g. fancy feast cheddar..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search product"
        />
        <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Find'}
        </button>
      </form>

      <div className="chips-row" aria-label="Quick search examples">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="chip"
            onClick={() => onQueryChange(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="sort-row" role="group" aria-label="Sort results">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`sort-pill ${sort === opt.value ? 'active' : ''}`}
            onClick={() => onSortChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </header>
  );
}
