import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pino from 'pino';
import { createApp } from '../app.ts';
import { CredentialStore } from '../auth/credentials.ts';
import { LoginRateLimiter } from '../auth/rate-limiter.ts';
import { loadConfig, type AppConfig } from '../config.ts';
import { openDatabase, type DbHandle } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { createServices } from '../services.ts';
import type { AppServices } from '../types.ts';

export const TEST_ORIGIN = 'http://localhost:5173';
const FAST_HASH = { N: 1024, r: 8, p: 1 };

export interface TestContext {
  app: ReturnType<typeof createApp>;
  services: AppServices;
  handle: DbHandle;
  config: AppConfig;
  /** Sends a request as the frontend would (same origin, JSON). */
  request(
    method: string,
    url: string,
    options?: { body?: unknown; cookie?: string; headers?: Record<string, string> },
  ): Promise<Response>;
  cleanup(): void;
}

export async function createTestContext(
  configOverrides: Partial<AppConfig> = {},
): Promise<TestContext> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-test-'));
  const config = {
    ...loadConfig({ NODE_ENV: 'test', DATA_DIR: dataDir, LOG_LEVEL: 'silent' }),
    ...configOverrides,
  };
  const handle = openDatabase(':memory:');
  await runMigrations(handle, { migrationsDir: config.migrationsDir });
  const services = createServices(config, pino({ level: 'silent' }), handle.db, {
    credentials: new CredentialStore(handle.db, FAST_HASH),
    loginLimiter: new LoginRateLimiter(),
  });
  const app = createApp(services);

  return {
    app,
    services,
    handle,
    config,
    async request(method, url, { body, cookie, headers = {} } = {}) {
      return app.request(url, {
        method,
        headers: {
          host: 'localhost:5173',
          origin: TEST_ORIGIN,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    },
    cleanup() {
      handle.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** Extracts "name=value" of the session cookie from a response. */
export function sessionCookie(res: Response): string | undefined {
  const header = res.headers.get('set-cookie');
  const match = header?.match(/lifeos_session=([^;]*)/);
  return match?.[1] ? `lifeos_session=${match[1]}` : undefined;
}
