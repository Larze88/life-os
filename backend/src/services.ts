import type { Logger } from 'pino';
import { CredentialStore } from './auth/credentials.ts';
import { LoginRateLimiter } from './auth/rate-limiter.ts';
import { SessionStore } from './auth/session-store.ts';
import type { AppConfig } from './config.ts';
import type { Db } from './db/client.ts';
import type { AppServices } from './types.ts';

export function createServices(
  config: AppConfig,
  logger: Logger,
  db: Db,
  overrides: Partial<AppServices> = {},
): AppServices {
  return {
    config,
    logger,
    db,
    sessions: new SessionStore(db),
    credentials: new CredentialStore(db),
    loginLimiter: new LoginRateLimiter(),
    ...overrides,
  };
}
