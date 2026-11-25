import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useEntries } from '@/features/tracking/tracking-api';
import { formatDecimal, formatTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { WidgetProps } from '../types';
import { MoodDetailSheet } from './MoodDetailSheet';
import { moodLevel } from './mood-levels';
import { MoodQuickActions } from './MoodQuickActions';

export function MoodWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const entries = useEntries(trackerDay?.tracker.id ?? '', date);
  if (!trackerDay) return null;

  const latest = entries.data?.at(-1);
  const level = latest?.value ? moodLevel(latest.value) : null;

  return (
    <Card className="gap-5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={de.mood.openDetails}
        className="-m-2 flex items-center gap-4 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-mood/15 text-5xl">
          {level ? level.emoji : <span className="text-3xl opacity-40">🙂</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{trackerDay.tracker.name}</p>
          <p className="truncate text-2xl font-bold tracking-tight">
            {level ? level.label : de.mood.question}
          </p>
          <p className="text-sm text-muted-foreground">
            {latest && trackerDay.value !== null
              ? trackerDay.count > 1
                ? de.mood.average(formatDecimal(trackerDay.value), trackerDay.count)
                : `${de.mood.latest} ${formatTime(latest.occurredAt)}`
              : de.mood.notYet}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
      <MoodQuickActions trackerDay={trackerDay} date={date} />
      <MoodDetailSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
