import pino, { type Logger } from 'pino';
import type { AppConfig } from '../config.ts';

/**
 * Structured logger. CLAUDE.md rule 1: never log request bodies, entry contents,
 * notes, tokens or cookies. The redaction list is a safety net, not a licence.
 */
export function createLogger(config: Pick<AppConfig, 'logLevel' | 'env'>): Logger {
  return pino({
    level: config.logLevel,
    redact: {
      paths: [
        'password',
        '*.password',
        'currentPassword',
        'newPassword',
        'token',
        '*.token',
        'cookie',
        '*.cookie',
        'headers.cookie',
        'headers.authorization',
        'body',
        '*.body',
        'note',
        'data',
      ],
      censor: '[redacted]',
    },
    ...(config.env === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}

export type { Logger };
