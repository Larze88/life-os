import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_PREFIX, BACKUP_REMINDER_DAYS, problemSchema, type BackupStatus } from '@lifeos/shared';
import { ApiError, NetworkError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useBackupStatus() {
  return useQuery({
    queryKey: queryKeys.backupStatus,
    queryFn: ({ signal }) => api<BackupStatus>('/backups/status', { signal }),
  });
}

/** URL of the backup download (a plain GET with the session cookie). */
export const BACKUP_DOWNLOAD_URL = `${API_PREFIX}/backups/download`;

export function useRestoreBackup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      let res: Response;
      try {
        res = await fetch(`${API_PREFIX}/backups/restore`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        });
      } catch {
        throw new NetworkError();
      }
      if (!res.ok) {
        const parsed = problemSchema.safeParse(await res.json().catch(() => null));
        throw new ApiError(
          res.status,
          parsed.success
            ? parsed.data
            : { type: 'about:blank', title: 'Error', status: res.status },
        );
      }
    },
    // Everything may have changed (data, password, settings).
    onSuccess: () => client.invalidateQueries(),
  });
}

/** True if no backup was downloaded for BACKUP_REMINDER_DAYS since data exists. */
export function backupReminderDue(
  status: BackupStatus | undefined,
  now: Date = new Date(),
): boolean {
  const reference = status?.lastDownloadAt ?? status?.firstEntryAt;
  if (!reference) return false;
  return now.getTime() - Date.parse(reference) > BACKUP_REMINDER_DAYS * 86_400_000;
}
