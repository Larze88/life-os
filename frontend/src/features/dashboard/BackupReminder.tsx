import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { backupReminderDue, useBackupStatus } from '@/features/settings/backup-api';
import { de } from '@/lib/i18n/de';

/** Nudges towards the manual off-device backup (ADR-013). */
export function BackupReminder() {
  const status = useBackupStatus();
  if (!backupReminderDue(status.data)) return null;
  return (
    <Link
      to="/einstellungen#datensicherung"
      className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-500/12 p-4 text-sm text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100"
    >
      <ShieldAlert className="size-5 shrink-0" />
      <span>{de.backup.reminder}</span>
    </Link>
  );
}
