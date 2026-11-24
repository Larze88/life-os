import type { ModuleRegistry } from '@lifeos/shared';
import type { Logger } from 'pino';
import type { CredentialStore } from './auth/credentials.ts';
import type { LoginRateLimiter } from './auth/rate-limiter.ts';
import type { Session, SessionStore } from './auth/session-store.ts';
import type { AppConfig } from './config.ts';
import type { Db, DbHandle } from './db/client.ts';

/** Services available to all routes. Created once in server.ts (or per test). */
export interface AppServices {
  config: AppConfig;
  logger: Logger;
  db: Db;
  /** Raw handle for backup/restore (SQLite backup API, ATTACH). */
  handle: DbHandle;
  sessions: SessionStore;
  credentials: CredentialStore;
  loginLimiter: LoginRateLimiter;
  modules: ModuleRegistry;
}

export interface AppEnv {
  Variables: {
    services: AppServices;
    session: Session;
  };
}
