import { createHash, randomBytes } from 'node:crypto';
import { desc, eq, lt } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { sessions } from '../db/schema.ts';

export const SESSION_COOKIE = 'lifeos_session';
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days, sliding
/** Refresh last-seen/expiry at most this often — keeps writes to the microSD low. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface Session {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  deviceLabel: string | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Rough, privacy-friendly device label ("Android · Chrome"). */
export function deviceLabelFromUserAgent(ua: string | undefined): string | null {
  if (!ua) return null;
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : null;
  const label = [os, browser].filter(Boolean).join(' · ');
  return label || null;
}

export class SessionStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Creates a session and returns the raw token (only ever sent to the client). */
  create(deviceLabel: string | null): { token: string; session: Session } {
    const token = randomBytes(32).toString('base64url');
    const now = this.now();
    const session: Session = {
      id: hashToken(token),
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      deviceLabel,
    };
    this.db.insert(sessions).values(session).run();
    return { token, session };
  }

  /** Returns the session for a token, extending it (sliding expiry) or null. */
  validate(token: string | undefined): Session | null {
    if (!token || token.length > 100) return null;
    const id = hashToken(token);
    const row = this.db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!row) return null;
    const now = this.now();
    if (Date.parse(row.expiresAt) <= now.getTime()) {
      this.db.delete(sessions).where(eq(sessions.id, id)).run();
      return null;
    }
    if (now.getTime() - Date.parse(row.lastSeenAt) >= TOUCH_INTERVAL_MS) {
      const update = {
        lastSeenAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      };
      this.db.update(sessions).set(update).where(eq(sessions.id, id)).run();
      return { ...row, ...update };
    }
    return row;
  }

  revoke(id: string): boolean {
    return this.db.delete(sessions).where(eq(sessions.id, id)).run().changes > 0;
  }

  revokeByToken(token: string): void {
    this.revoke(hashToken(token));
  }

  revokeAll(): void {
    this.db.delete(sessions).run();
  }

  list(): Session[] {
    return this.db.select().from(sessions).orderBy(desc(sessions.lastSeenAt)).all();
  }

  purgeExpired(): number {
    return this.db.delete(sessions).where(lt(sessions.expiresAt, this.now().toISOString())).run()
      .changes;
  }
}
