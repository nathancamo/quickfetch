import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { getProfile, updateProfile } from '../db.js';
import type { DeliveryProfile } from '../../../shared/types.js';

export function registerProfileRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/api/profile', async () => {
    return getProfile(db);
  });

  app.put<{ Body: Partial<DeliveryProfile> }>('/api/profile', async (request) => {
    return updateProfile(db, request.body ?? {});
  });
}
