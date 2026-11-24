import { useState } from 'react';
import { ChevronRight, Droplet } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { WidgetProps } from '../types';
import { WaterDetailSheet } from './WaterDetailSheet';
import { WaterQuickActions } from './WaterQuickActions';

export function WaterWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  if (!trackerDay) return null;

  const total = trackerDay.value ?? 0;
  const target = trackerDay.goal?.target ?? null;
  const progress = target ? total / target : 0;
  const reached = target !== null && total >= target;

  return (
    <Card className="gap-5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-m-2 flex items-center gap-4 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={de.water.openDetails}
      >
        <ProgressRing
          progress={progress}
          className="text-water"
          trackClassName="text-water/15"
          label={de.water.progressLabel}
        >
          <Droplet className="size-6 text-water" fill={reached ? 'currentColor' : 'none'} />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{trackerDay.tracker.name}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {formatNumber(total)}
            <span className="ml-1 text-base font-medium text-muted-foreground">ml</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {target === null
              ? de.water.noGoal
              : reached
                ? de.water.goalReached
                : de.water.remaining(formatNumber(target - total), formatNumber(target))}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
      <WaterQuickActions trackerDay={trackerDay} date={date} />
      <WaterDetailSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
