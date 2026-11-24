import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { authCredentials } from '../db/schema.ts';
import { hashPassword, verifyPassword } from './password.ts';

const SINGLE_USER_ID = 1;

/** Stores the single user's password hash (ADR-001, ADR-009). */
export class CredentialStore {
  constructor(
    private readonly db: Db,
    private readonly hashParams?: { N: number; r: number; p: number },
  ) {}

  isSetUp(): boolean {
    return this.db.select({ id: authCredentials.id }).from(authCredentials).get() !== undefined;
  }

  /** Sets the initial password. Returns false if a password already exists. */
  async setInitial(password: string): Promise<boolean> {
    const passwordHash = await hashPassword(password, this.hashParams);
    const result = this.db
      .insert(authCredentials)
      .values({ id: SINGLE_USER_ID, passwordHash })
      .onConflictDoNothing()
      .run();
    return result.changes === 1;
  }

  async verify(password: string): Promise<boolean> {
    const row = this.db
      .select()
      .from(authCredentials)
      .where(eq(authCredentials.id, SINGLE_USER_ID))
      .get();
    if (!row) return false;
    return verifyPassword(password, row.passwordHash);
  }

  async change(newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword, this.hashParams);
    this.db
      .update(authCredentials)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(authCredentials.id, SINGLE_USER_ID))
      .run();
  }
}
