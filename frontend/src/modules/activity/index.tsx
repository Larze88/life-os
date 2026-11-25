import { useState } from 'react';
import { Activity, Plus } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { WidgetHeader } from '@/components/tracking/WidgetHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDuration } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';
import { ActivitySheet } from './ActivitySheet';

function ActivityWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  if (!trackerDay) return null;
  const minutes = trackerDay.value ?? 0;
  const target = trackerDay.goal?.target ?? null;
  return (
    <Card className="gap-4">
      <WidgetHeader
        onClick={() => setOpen(true)}
        label={de.activity.openDetails}
        title={trackerDay.tracker.name}
        visual={
          <ProgressRing
            progress={target ? minutes / target : 0}
            size={64}
            stroke={8}
            className="text-activity"
            trackClassName="text-activity/15"
            label={de.activity.progressLabel}
          >
            <Activity className="size-5 text-activity" />
          </ProgressRing>
        }
        value={minutes ? formatDuration(minutes) : '–'}
        detail={
          minutes ? (target ? de.activity.ofGoal(formatDuration(target)) : null) : de.activity.none
        }
      />
      <ActivityQuickActions trackerDay={trackerDay} date={date} />
      <ActivitySheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function ActivityQuickActions({ trackerDay, date }: TrackerUiProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className="h-12 w-full bg-activity/12 text-base font-semibold text-activity hover:bg-activity/20"
        onClick={() => setOpen(true)}
      >
        <Plus /> {de.activity.add}
      </Button>
      <ActivitySheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}

export const activityFrontend: FrontendModule = {
  id: 'activity',
  widgets: { 'activity.today': ActivityWidget },
  QuickActions: ActivityQuickActions,
};
