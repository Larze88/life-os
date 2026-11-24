/**
 * UUIDv7 (RFC 9562): 48-bit Unix millisecond timestamp + random bits.
 * Time-sortable and generated on the client, so writes are idempotent (ADR-004).
 * Uses Web Crypto, available in browsers and Node.js.
 */

const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  // 48-bit big-endian timestamp
  let ts = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }
  bytes[6] = 0x70 | (bytes[6]! & 0x0f); // version 7
  bytes[8] = 0x80 | (bytes[8]! & 0x3f); // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isUuidV7(value: string): boolean {
  return UUID_V7_RE.test(value);
}
