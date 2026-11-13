import { buildApp } from './app.js';
import { createDb } from './db.js';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.DB_PATH ?? './quickfetch.sqlite';

const db = createDb(dbPath);
const app = buildApp(db);

async function start(): Promise<void> {
  await app.listen({ port, host });
  console.log(`QuickFetch server listening at http://${host}:${port}`);
}

function shutdown(): void {
  void app.close().then(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();
