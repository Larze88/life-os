import { useState } from 'react';
import { ChevronRight, Moon } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEntries } from '@/features/tracking/tracking-api';
import { formatDuration } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { TrackerUiProps, WidgetProps } from '../types';
import { SleepDetailSheet } from './SleepDetailSheet';
import { timeOf } from './sleep-times';

export function SleepWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const entries = useEntries(trackerDay?.tracker.id ?? '', date);
  if (!trackerDay) return null;

  const minutes = trackerDay.value;
  const target = trackerDay.goal?.target ?? null;
  const main = entries.data?.reduce<(typeof entries.data)[number] | undefined>(
    (longest, e) => (!longest || (e.value ?? 0) > (longest.value ?? 0) ? e : longest),
    undefined,
  );

  return (
    <Card className="gap-5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={de.sleep.openDetails}
        className="-m-2 flex items-center gap-4 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ProgressRing
          progress={minutes && target ? minutes / target : 0}
          className="text-sleep"
          trackClassName="text-sleep/15"
          label={de.sleep.progressLabel}
        >
          <Moon
            className="size-6 text-sleep"
            fill={minutes && target && minutes >= target ? 'currentColor' : 'none'}
          />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{de.sleep.title}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {minutes ? formatDuration(minutes) : '–'}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {main?.endsAt
              ? `${timeOf(main.occurredAt)} – ${timeOf(main.endsAt)} · ${de.sleep.qualityShort(Number(main.data.quality ?? 0))}`
              : target
                ? `${de.sleep.noEntry} · ${de.sleep.goal(formatDuration(target))}`
                : de.sleep.noEntry}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
      {!minutes && (
        <Button
          variant="secondary"
          className="h-12 bg-sleep/12 text-base font-semibold text-sleep hover:bg-sleep/20"
          onClick={() => setOpen(true)}
        >
          <Moon /> {de.sleep.add}
        </Button>
      )}
      <SleepDetailSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

/** In the quick-add sheet: opens the sleep form. */
export function SleepQuickActions({ trackerDay, date }: TrackerUiProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className="h-12 w-full bg-sleep/12 text-base font-semibold text-sleep hover:bg-sleep/20"
        onClick={() => setOpen(true)}
      >
        <Moon /> {de.sleep.add}
      </Button>
      <SleepDetailSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}
