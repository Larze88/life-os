import { useState } from 'react';
import { Archive, Pencil, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Tracker } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { useArchiveTracker, useTrackers } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import { CustomTrackerEditor } from './CustomTrackerEditor';

export function CustomTrackersSection() {
  const trackers = useTrackers();
  const archive = useArchiveTracker();
  const [editing, setEditing] = useState<Tracker | 'new' | null>(null);
  const custom = (trackers.data ?? []).filter((t) => t.module === 'custom');

  return (
    <div className="flex flex-col gap-3">
      {custom.length === 0 ? (
        <p className="text-sm text-muted-foreground">{de.custom.none}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
          {custom.map((t) => (
            <li key={t.id} className="flex min-h-14 items-center gap-2 py-1 pl-4 pr-1">
              <span
                className="flex size-8 shrink-0 items-center justify-center text-lg"
                aria-hidden
              >
                {t.icon || <Sparkles className="size-4 text-custom" />}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t.name} ${de.custom.edit}`}
                onClick={() => setEditing(t)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t.name} ${de.custom.archive}`}
                onClick={() => {
                  if (!window.confirm(de.custom.archiveConfirm(t.name))) return;
                  archive.mutate(t.id, { onError: () => toast.error(de.common.notSaved) });
                }}
              >
                <Archive />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" onClick={() => setEditing('new')}>
        <Plus /> {de.custom.create}
      </Button>
      <CustomTrackerEditor
        key={editing === 'new' ? 'new' : (editing?.id ?? 'none')}
        tracker={editing && editing !== 'new' ? editing : undefined}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
