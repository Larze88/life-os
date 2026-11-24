import { moduleRegistry } from '@lifeos/shared';
import type { Logger } from 'pino';
import { CredentialStore } from './auth/credentials.ts';
import { LoginRateLimiter } from './auth/rate-limiter.ts';
import { SessionStore } from './auth/session-store.ts';
import type { AppConfig } from './config.ts';
import type { DbHandle } from './db/client.ts';
import type { AppServices } from './types.ts';

export function createServices(
  config: AppConfig,
  logger: Logger,
  handle: DbHandle,
  overrides: Partial<AppServices> = {},
): AppServices {
  return {
    config,
    logger,
    db: handle.db,
    handle,
    sessions: new SessionStore(handle.db),
    credentials: new CredentialStore(handle.db),
    loginLimiter: new LoginRateLimiter(),
    modules: moduleRegistry,
    ...overrides,
  };
}
