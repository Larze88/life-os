import { describe, expect, it } from 'vitest';
import { isUuidV7, uuidv7 } from './uuid-v7.ts';

describe('uuidv7', () => {
  it('produces valid version 7 UUIDs', () => {
    for (let i = 0; i < 100; i++) expect(isUuidV7(uuidv7())).toBe(true);
  });

  it('is sortable by creation time', () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    expect(a < b).toBe(true);
  });

  it('encodes the timestamp in the first 48 bits', () => {
    const id = uuidv7(0x0123456789ab);
    expect(id.startsWith('01234567-89ab-7')).toBe(true);
  });

  it('is unique', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
  });
});
