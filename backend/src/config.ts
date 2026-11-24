import path from 'node:path';
import { z } from 'zod';

const repoRoot = path.resolve(import.meta.dirname, '../..');

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().default('127.0.0.1'),
  DATA_DIR: z.string().default(path.join(repoRoot, 'database', 'data')),
  MIGRATIONS_DIR: z.string().default(path.join(repoRoot, 'database', 'migrations')),
  STATIC_DIR: z.string().optional(),
  COOKIE_SECURE: booleanString.optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  host: string;
  dataDir: string;
  dbFile: string;
  snapshotDir: string;
  migrationsDir: string;
  staticDir: string | undefined;
  cookieSecure: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  version: string;
}

export const APP_VERSION = '0.1.0';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  const e = parsed.data;
  const dataDir = path.resolve(e.DATA_DIR);
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    dataDir,
    dbFile: path.join(dataDir, 'lifeos.db'),
    snapshotDir: path.join(dataDir, 'backups'),
    migrationsDir: path.resolve(e.MIGRATIONS_DIR),
    staticDir: e.STATIC_DIR ? path.resolve(e.STATIC_DIR) : undefined,
    cookieSecure: e.COOKIE_SECURE ?? e.NODE_ENV === 'production',
    logLevel: e.LOG_LEVEL,
    version: APP_VERSION,
  };
}
