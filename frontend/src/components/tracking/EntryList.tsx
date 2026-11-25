import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Entry } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { useDeleteEntry } from '@/features/tracking/tracking-api';
import { formatTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';

/** Generic list of entries with time, custom content and a delete button. */
export function EntryList({
  title,
  entries,
  date,
  render,
  empty,
  showDate = false,
}: {
  title: string;
  entries: Entry[] | undefined;
  /** Day used for the optimistic dashboard update; defaults to each entry's own day. */
  date?: string;
  render: (entry: Entry) => ReactNode;
  empty?: string;
  showDate?: boolean;
}) {
  const remove = useDeleteEntry();
  if (!entries) return null;
  if (entries.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2 border-t pt-4" aria-label={title}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">
                {showDate
                  ? new Date(`${entry.localDate}T12:00:00`).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : formatTime(entry.occurredAt)}
              </span>
              <div className="min-w-0 flex-1">{render(entry)}</div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={de.common.delete}
                onClick={() =>
                  remove.mutate(
                    {
                      id: entry.id,
                      date: date ?? entry.localDate,
                      trackerId: entry.trackerId,
                      value: entry.value,
                    },
                    { onError: () => toast.error(de.common.notSaved) },
                  )
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
