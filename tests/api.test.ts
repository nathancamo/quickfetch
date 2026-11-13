import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../server/src/app.js';
import { createDb } from '../server/src/db.js';
import type { SearchResponse } from '../shared/types.js';

describe('QuickFetch API', () => {
  const openDbs: Array<ReturnType<typeof createDb>> = [];

  afterEach(() => {
    while (openDbs.length > 0) {
      openDbs.pop()?.close();
    }
  });

  it('returns health status', async () => {
    const db = createDb(':memory:');
    openDbs.push(db);
    const app = buildApp(db);

    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });

  it('searches fancy feast cheddar with delivery fees, service fees, and ETAs', async () => {
    const db = createDb(':memory:');
    openDbs.push(db);
    const app = buildApp(db);

    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=fancy%20feast%20cheddar&sort=cheapest',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as SearchResponse;
    expect(body.query).toBe('fancy feast cheddar');
    expect(body.offers.length).toBeGreaterThan(2);
    expect(body.summary.length).toBeGreaterThan(10);

    const first = body.offers[0];
    expect(first).toBeDefined();
    expect(first?.totalLandedCost).toBeCloseTo(
      (first?.itemPrice ?? 0) + (first?.deliveryFee ?? 0) + (first?.serviceFee ?? 0),
      2,
    );
  });

  it('updates delivery profile and persists in SQLite', async () => {
    const db = createDb(':memory:');
    openDbs.push(db);
    const app = buildApp(db);

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { postcode: '3000', suburb: 'Melbourne', uberOne: true },
    });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.json()).toMatchObject({
      postcode: '3000',
      suburb: 'Melbourne',
      uberOne: true,
    });
  });
});
