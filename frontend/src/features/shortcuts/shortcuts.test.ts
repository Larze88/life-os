import { describe, expect, it } from 'vitest';
import { SHORTCUTS, parseShortcutAction } from './shortcuts';

const parse = (query: string) => parseShortcutAction(new URLSearchParams(query));

describe('home-screen shortcuts', () => {
  it('parses the supported actions', () => {
    expect(parse('aktion=eintragen&tracker=water&wert=250')).toEqual({
      type: 'add',
      trackerKey: 'water',
      value: 250,
    });
    expect(parse('aktion=oeffnen&tracker=mood')).toEqual({ type: 'open', trackerKey: 'mood' });
    expect(parse('aktion=erfassen')).toEqual({ type: 'quickAdd' });
  });

  it('ignores malformed or missing actions', () => {
    expect(parse('')).toBeNull();
    expect(parse('aktion=eintragen&tracker=water&wert=abc')).toBeNull();
    expect(parse('aktion=eintragen&tracker=water&wert=-5')).toBeNull();
    expect(parse('aktion=oeffnen&tracker=../etc')).toBeNull();
    expect(parse('aktion=loeschen&tracker=water')).toBeNull();
  });

  it('every manifest shortcut is understood by the app', () => {
    for (const s of SHORTCUTS)
      expect(parse(new URL(s.url, 'http://x').search.slice(1))).not.toBeNull();
    expect(SHORTCUTS.length).toBeLessThanOrEqual(4); // Android shows at most four
  });
});
