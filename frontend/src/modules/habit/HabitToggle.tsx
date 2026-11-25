import { Check } from 'lucide-react';
import type { Entry, TrackerDay } from '@lifeos/shared';
import { useDeleteEntry } from '@/features/tracking/tracking-api';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import { habitConfig, scheduleText } from './habit-utils';

/**
 * One habit row: tap the circle to record a completion; when the daily target is
 * reached, tapping again takes back the last completion.
 */
export function HabitToggle({
  trackerDay,
  date,
  entries,
}: {
  trackerDay: TrackerDay;
  date: string;
  entries: Entry[] | undefined;
}) {
  const quickAdd = useQuickAdd();
  const remove = useDeleteEntry();
  const config = habitConfig(trackerDay);
  const { name } = trackerDay.tracker;
  const count = trackerDay.count;
  const done = count >= config.targetPerDay;
  const last = entries?.filter((e) => e.trackerId === trackerDay.tracker.id).at(-1);

  function onClick() {
    if (!done) {
      quickAdd.add({
        date,
        trackerId: trackerDay.tracker.id,
        value: 1,
        message: de.habits.done(name),
      });
    } else if (last) {
      remove.mutate({ id: last.id, date, trackerId: trackerDay.tracker.id, value: last.value });
    }
  }

  return (
    <div className="flex min-h-12 items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={done}
        aria-label={done ? de.habits.undoDone(name) : de.habits.markDone(name)}
        disabled={done && !last}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90',
          done ? 'border-habit bg-habit text-white' : 'border-habit/40 text-habit',
        )}
      >
        {done ? (
          <Check className="size-5" strokeWidth={3} />
        ) : config.targetPerDay > 1 ? (
          `${count}/${config.targetPerDay}`
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate font-medium',
            done && 'text-muted-foreground line-through decoration-habit/60',
          )}
        >
          {name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{scheduleText(config)}</p>
      </div>
    </div>
  );
}
