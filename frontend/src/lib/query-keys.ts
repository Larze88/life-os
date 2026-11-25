/** Central TanStack Query keys (CLAUDE.md conventions). */
export const queryKeys = {
  authStatus: ['auth', 'status'] as const,
  sessions: ['auth', 'sessions'] as const,
  health: ['health'] as const,
  settings: ['settings'] as const,
  backupStatus: ['backups', 'status'] as const,
  /** Prefix for everything derived from entries — invalidate after writes. */
  tracking: ['tracking'] as const,
  day: (date: string) => ['tracking', 'day', date] as const,
  entries: (trackerId: string, from: string, to: string) =>
    ['tracking', 'entries', trackerId, from, to] as const,
  dayEntries: (date: string) => ['tracking', 'entries', '*', date] as const,
  dashboard: ['tracking', 'dashboard'] as const,
  history: ['tracking', 'history'] as const,
  /** Under 'tracking' so that every write refreshes statistics as well. */
  statsSeries: (trackerId: string, from: string, to: string) =>
    ['tracking', 'stats', trackerId, from, to] as const,
  correlation: (a: string, b: string, from: string, to: string, lag: number) =>
    ['tracking', 'correlation', a, b, from, to, lag] as const,
};
