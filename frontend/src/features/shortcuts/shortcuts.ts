/**
 * Home-screen shortcuts (long press on the app icon, Android). Single source for the web
 * app manifest (vite.config.ts) and for executing the action when the app opens.
 * Plain data without imports so the Vite config can use it directly.
 *
 * URL format: /?aktion=eintragen&tracker=<key>&wert=<n>  → record a value immediately
 *             /?aktion=oeffnen&tracker=<key>              → open the tracker's entry sheet
 *             /?aktion=erfassen                           → open the quick-add sheet
 */
export interface ShortcutDefinition {
  name: string;
  shortName: string;
  url: string;
  icon: string;
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    name: '+250 ml Wasser',
    shortName: '+250 ml',
    url: '/?aktion=eintragen&tracker=water&wert=250',
    icon: 'shortcut-water.png',
  },
  {
    name: 'Stimmung erfassen',
    shortName: 'Stimmung',
    url: '/?aktion=oeffnen&tracker=mood',
    icon: 'shortcut-mood.png',
  },
  {
    name: 'Schlaf eintragen',
    shortName: 'Schlaf',
    url: '/?aktion=oeffnen&tracker=sleep',
    icon: 'shortcut-sleep.png',
  },
  {
    name: 'Schnell erfassen',
    shortName: 'Erfassen',
    url: '/?aktion=erfassen',
    icon: 'shortcut-add.png',
  },
];

export type ShortcutAction =
  | { type: 'add'; trackerKey: string; value: number }
  | { type: 'open'; trackerKey: string }
  | { type: 'quickAdd' };

/** Reads a shortcut action from the URL; anything malformed is ignored. */
export function parseShortcutAction(params: URLSearchParams): ShortcutAction | null {
  const action = params.get('aktion');
  const trackerKey = params.get('tracker') ?? '';
  const validKey = /^[a-z0-9-]{1,80}$/.test(trackerKey);
  if (action === 'erfassen') return { type: 'quickAdd' };
  if (action === 'oeffnen' && validKey) return { type: 'open', trackerKey };
  if (action === 'eintragen' && validKey) {
    const value = Number(params.get('wert'));
    if (Number.isFinite(value) && value > 0) return { type: 'add', trackerKey, value };
  }
  return null;
}
