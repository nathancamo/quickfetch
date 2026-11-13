import Database from 'better-sqlite3';
import type { DeliveryProfile, RecentSearch, RawOffer } from '../../shared/types.js';

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

export function createDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  // Why: WAL mode allows concurrent reads while writing search cache entries and improves crash safety.
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      postcode TEXT NOT NULL,
      suburb TEXT NOT NULL,
      amazon_prime INTEGER NOT NULL,
      woolworths_unlimited INTEGER NOT NULL,
      coles_plus INTEGER NOT NULL,
      uber_one INTEGER NOT NULL,
      dash_pass INTEGER NOT NULL,
      default_sort TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_cache (
      cache_key TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      postcode TEXT NOT NULL,
      mode TEXT NOT NULL,
      offers_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      postcode TEXT NOT NULL,
      best_price REAL,
      fastest_eta TEXT,
      searched_at TEXT NOT NULL
    );
  `);

  ensureDefaultProfile(db);
  return db;
}

function ensureDefaultProfile(db: Database.Database): void {
  const existing = db.prepare('SELECT id FROM profile WHERE id = 1').get();
  if (existing) return;

  db.prepare(
    `INSERT INTO profile (
      id, postcode, suburb, amazon_prime, woolworths_unlimited,
      coles_plus, uber_one, dash_pass, default_sort
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    DEFAULT_PROFILE.postcode,
    DEFAULT_PROFILE.suburb,
    DEFAULT_PROFILE.amazonPrime ? 1 : 0,
    DEFAULT_PROFILE.woolworthsUnlimited ? 1 : 0,
    DEFAULT_PROFILE.colesPlus ? 1 : 0,
    DEFAULT_PROFILE.uberOne ? 1 : 0,
    DEFAULT_PROFILE.dashPass ? 1 : 0,
    DEFAULT_PROFILE.defaultSort,
  );
}

interface ProfileRow {
  postcode: string;
  suburb: string;
  amazon_prime: number;
  woolworths_unlimited: number;
  coles_plus: number;
  uber_one: number;
  dash_pass: number;
  default_sort: DeliveryProfile['defaultSort'];
}

export function getProfile(db: Database.Database): DeliveryProfile {
  const row = db.prepare('SELECT * FROM profile WHERE id = 1').get() as ProfileRow | undefined;
  if (!row) return DEFAULT_PROFILE;

  return {
    postcode: row.postcode,
    suburb: row.suburb,
    amazonPrime: row.amazon_prime === 1,
    woolworthsUnlimited: row.woolworths_unlimited === 1,
    colesPlus: row.coles_plus === 1,
    uberOne: row.uber_one === 1,
    dashPass: row.dash_pass === 1,
    defaultSort: row.default_sort,
  };
}

export function updateProfile(
  db: Database.Database,
  patch: Partial<DeliveryProfile>,
): DeliveryProfile {
  const next = { ...getProfile(db), ...patch };
  db.prepare(
    `UPDATE profile SET
      postcode = ?, suburb = ?, amazon_prime = ?, woolworths_unlimited = ?,
      coles_plus = ?, uber_one = ?, dash_pass = ?, default_sort = ?
    WHERE id = 1`,
  ).run(
    next.postcode,
    next.suburb,
    next.amazonPrime ? 1 : 0,
    next.woolworthsUnlimited ? 1 : 0,
    next.colesPlus ? 1 : 0,
    next.uberOne ? 1 : 0,
    next.dashPass ? 1 : 0,
    next.defaultSort,
  );
  return next;
}

const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheRow {
  offers_json: string;
  mode: 'live' | 'estimated';
  created_at: number;
}

export function getCachedOffers(
  db: Database.Database,
  query: string,
  postcode: string,
): { offers: RawOffer[]; mode: 'live' | 'estimated' } | null {
  const key = `${query.trim().toLowerCase()}::${postcode.trim()}`;
  const row = db
    .prepare('SELECT offers_json, mode, created_at FROM search_cache WHERE cache_key = ?')
    .get(key) as CacheRow | undefined;

  if (!row) return null;
  if (Date.now() - row.created_at > CACHE_TTL_MS) return null;

  return {
    offers: JSON.parse(row.offers_json) as RawOffer[],
    mode: row.mode,
  };
}

export function saveCachedOffers(
  db: Database.Database,
  query: string,
  postcode: string,
  mode: 'live' | 'estimated',
  offers: RawOffer[],
): void {
  const key = `${query.trim().toLowerCase()}::${postcode.trim()}`;
  db.prepare(
    `INSERT INTO search_cache (cache_key, query, postcode, mode, offers_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       mode = excluded.mode,
       offers_json = excluded.offers_json,
       created_at = excluded.created_at`,
  ).run(key, query.trim(), postcode.trim(), mode, JSON.stringify(offers), Date.now());
}

export function recordRecentSearch(db: Database.Database, entry: RecentSearch): void {
  db.prepare(
    `DELETE FROM recent_searches WHERE lower(query) = lower(?) AND postcode = ?`,
  ).run(entry.query, entry.postcode);

  db.prepare(
    `INSERT INTO recent_searches (query, postcode, best_price, fastest_eta, searched_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(entry.query, entry.postcode, entry.bestPrice, entry.fastestEta, entry.searchedAt);
}

export function getRecentSearches(db: Database.Database, limit = 8): RecentSearch[] {
  const rows = db
    .prepare(
      `SELECT query, postcode, best_price, fastest_eta, searched_at
       FROM recent_searches ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    query: string;
    postcode: string;
    best_price: number | null;
    fastest_eta: string | null;
    searched_at: string;
  }>;

  return rows.map((row) => ({
    query: row.query,
    postcode: row.postcode,
    bestPrice: row.best_price,
    fastestEta: row.fastest_eta,
    searchedAt: row.searched_at,
  }));
}
