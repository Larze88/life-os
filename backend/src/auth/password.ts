import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing with scrypt from node:crypto (ADR-009, no extra dependency).
 * Format: scrypt$N$r$p$saltBase64$hashBase64 — parameters are stored with the hash,
 * so they can be raised later without invalidating existing hashes.
 */

const KEY_LENGTH = 64;
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;

function scryptAsync(password: string, salt: Buffer, params: { N: number; r: number; p: number }) {
  const options: ScryptOptions = { ...params, maxmem: 128 * params.N * params.r * 2 };
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(
  password: string,
  params: { N: number; r: number; p: number } = DEFAULT_PARAMS,
): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, params);
  return [
    'scrypt',
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts as [string, string, string, string, string, string];
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Object.values(params).every((v) => Number.isInteger(v) && v > 0)) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), params);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
