import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { getRecentSearches } from '../db.js';
import { runSearch } from '../services/searchService.js';
import type { SortMode } from '../../../shared/types.js';

interface SearchQuery {
  q?: string;
  sort?: SortMode;
  refresh?: string;
}

const VALID_SORTS = new Set<SortMode>(['balanced', 'fastest', 'cheapest']);

export function registerSearchRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get<{ Querystring: SearchQuery }>('/api/search', async (request, reply) => {
    const query = request.query.q?.trim();
    if (!query) {
      return reply.code(400).send({ error: 'Query parameter "q" is required.' });
    }

    const sortParam = request.query.sort;
    const sort = sortParam && VALID_SORTS.has(sortParam) ? sortParam : undefined;
    const forceRefresh = request.query.refresh === '1';

    return runSearch(db, query, sort, forceRefresh, {
      geminiApiKey: process.env.GEMINI_API_KEY,
      serpApiKey: process.env.SERPAPI_KEY,
    });
  });

  app.get('/api/recent', async () => {
    return { items: getRecentSearches(db) };
  });
}
