import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import type Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerHealthRoutes } from './routes/health.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerSearchRoutes } from './routes/search.js';

export function buildApp(db: Database.Database): FastifyInstance {
  const app = Fastify({ logger: false });

  registerHealthRoutes(app, db);
  registerProfileRoutes(app, db);
  registerSearchRoutes(app, db);

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const webDistDir = resolve(currentDir, '../../../dist/web');

  if (existsSync(webDistDir)) {
    app.register(fastifyStatic, {
      root: webDistDir,
      prefix: '/',
    });
  }

  return app;
}
