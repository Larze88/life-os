import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.ts';

const fast = { N: 1024, r: 8, p: 1 };

describe('password hashing', () => {
  it('verifies the correct password only', async () => {
    const hash = await hashPassword('correct horse battery', fast);
    expect(hash.startsWith('scrypt$1024$8$1$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong horse battery', hash)).toBe(false);
  });

  it('uses a random salt', async () => {
    expect(await hashPassword('same password', fast)).not.toBe(
      await hashPassword('same password', fast),
    );
  });

  it('normalizes unicode', async () => {
    const hash = await hashPassword('Ä-passwort-123', fast); // precomposed
    expect(await verifyPassword('Ä-passwort-123', hash)).toBe(true); // decomposed
  });

  it('rejects malformed hashes', async () => {
    expect(await verifyPassword('x', 'plain')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$a$b$c$d$e')).toBe(false);
  });

  it('works with the default (production) parameters', async () => {
    const hash = await hashPassword('default params pw');
    expect(await verifyPassword('default params pw', hash)).toBe(true);
  });
});
