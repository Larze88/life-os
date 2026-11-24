import fs from 'node:fs';
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDatabase } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';
import { createLogger } from './lib/logger.ts';
import { createServices } from './services.ts';
import { seedModules } from './core/seed.ts';

const config = loadConfig();
const logger = createLogger(config);

fs.mkdirSync(config.dataDir, { recursive: true });
const handle = openDatabase(config.dbFile);

try {
  await runMigrations(handle, {
    migrationsDir: config.migrationsDir,
    snapshotDir: config.snapshotDir,
    logger,
  });
} catch (err) {
  logger.fatal({ err }, 'database migration failed — server not started');
  handle.close();
  process.exit(1);
}

const services = createServices(config, logger, handle.db);
const seeded = seedModules(handle.db, services.modules);
if (seeded.length > 0) logger.info({ trackers: seeded }, 'default trackers created');
services.sessions.purgeExpired();
const app = createApp(services);

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  logger.info(
    {
      address: `http://${config.host}:${info.port}`,
      env: config.env,
      static: Boolean(config.staticDir),
    },
    `Life OS ${config.version} listening`,
  );
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    handle.close();
    process.exit(0);
  });
  // Do not hang forever on open keep-alive connections.
  setTimeout(() => {
    handle.close();
    process.exit(0);
  }, 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
