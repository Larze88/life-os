import { describe, expect, it } from 'vitest';
import { backupReminderDue } from './backup-api';

const now = new Date('2026-12-31T12:00:00Z');

describe('backupReminderDue', () => {
  it('stays quiet without data', () => {
    expect(backupReminderDue({ lastDownloadAt: null, firstEntryAt: null }, now)).toBe(false);
  });
  it('reminds 14 days after the first entry if never downloaded', () => {
    expect(
      backupReminderDue({ lastDownloadAt: null, firstEntryAt: '2026-12-20T00:00:00Z' }, now),
    ).toBe(false);
    expect(
      backupReminderDue({ lastDownloadAt: null, firstEntryAt: '2026-12-01T00:00:00Z' }, now),
    ).toBe(true);
  });
  it('reminds 14 days after the last download', () => {
    expect(
      backupReminderDue(
        { lastDownloadAt: '2026-12-25T00:00:00Z', firstEntryAt: '2026-01-01T00:00:00Z' },
        now,
      ),
    ).toBe(false);
    expect(
      backupReminderDue(
        { lastDownloadAt: '2026-12-01T00:00:00Z', firstEntryAt: '2026-01-01T00:00:00Z' },
        now,
      ),
    ).toBe(true);
  });
});
