import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/api/health', async () => {
    db.prepare('SELECT 1').get();
    return {
      ok: true,
      providers: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        serpApi: Boolean(process.env.SERPAPI_KEY),
      },
    };
  });
}
