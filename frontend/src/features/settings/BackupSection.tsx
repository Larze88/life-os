import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { BACKUP_DOWNLOAD_URL, useBackupStatus, useRestoreBackup } from './backup-api';

export function BackupSection() {
  const status = useBackupStatus();
  const restore = useRestoreBackup();
  const fileInput = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!window.confirm(de.backup.restoreConfirm)) return;
    restore.mutate(file, {
      onSuccess: () => toast.success(de.backup.restored),
      onError: (error) =>
        toast.error(
          error instanceof ApiError
            ? (error.problem.detail ?? de.common.error)
            : de.common.networkError,
        ),
      onSettled: () => {
        if (fileInput.current) fileInput.current.value = '';
      },
    });
  }

  const last = status.data?.lastDownloadAt;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {de.backup.lastDownload}: {last ? formatDateTime(last) : de.backup.never}
      </p>
      <Button asChild>
        <a
          href={BACKUP_DOWNLOAD_URL}
          download
          onClick={() => setTimeout(() => void status.refetch(), 1500)}
        >
          <Download /> {de.backup.download}
        </a>
      </Button>
      <p className="text-xs text-muted-foreground">{de.backup.downloadHint}</p>
      <input
        ref={fileInput}
        type="file"
        accept=".db,application/vnd.sqlite3,application/octet-stream"
        className="hidden"
        aria-label={de.backup.restore}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        disabled={restore.isPending}
        onClick={() => fileInput.current?.click()}
      >
        <Upload /> {restore.isPending ? de.common.loading : de.backup.restore}
      </Button>
    </div>
  );
}
