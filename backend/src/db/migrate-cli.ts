import fs from 'node:fs';
import { loadConfig } from '../config.ts';
import { createLogger } from '../lib/logger.ts';
import { openDatabase } from './client.ts';
import { runMigrations } from './migrate.ts';

// `npm run db:migrate` — applies migrations without starting the server.
const config = loadConfig();
const logger = createLogger(config);
fs.mkdirSync(config.dataDir, { recursive: true });
const handle = openDatabase(config.dbFile);
try {
  const result = await runMigrations(handle, {
    migrationsDir: config.migrationsDir,
    snapshotDir: config.snapshotDir,
    logger,
  });
  if (result.applied === 0) logger.info('database is up to date');
} finally {
  handle.close();
}
