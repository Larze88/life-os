import { useState } from 'react';
import { ListChecks, Plus, Settings2 } from 'lucide-react';
import { isHabitDue } from '@lifeos/shared';
import { ProgressRing } from '@/components/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDayEntries } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import type { WidgetProps } from '../types';
import { habitConfig } from './habit-utils';
import { HabitsManageSheet } from './HabitsManageSheet';
import { HabitToggle } from './HabitToggle';

export function HabitsWidget({ day, date }: WidgetProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const entries = useDayEntries(date);
  const habits = day.trackers.filter((t) => t.tracker.module === 'habit');
  const due = habits.filter((h) => isHabitDue(habitConfig(h), date));
  const notDue = habits.filter((h) => !due.includes(h));
  const doneCount = due.filter((h) => h.count >= habitConfig(h).targetPerDay).length;

  return (
    <Card className="gap-4">
      <div className="flex items-center gap-4">
        <ProgressRing
          progress={due.length ? doneCount / due.length : 0}
          size={56}
          stroke={7}
          className="text-habit"
          trackClassName="text-habit/15"
          label={de.habits.title}
        >
          <ListChecks className="size-5 text-habit" />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{de.habits.title}</p>
          <p className="text-lg font-semibold">
            {habits.length === 0
              ? de.habits.empty
              : due.length === 0
                ? de.habits.noneDue
                : doneCount === due.length
                  ? de.habits.allDone
                  : de.habits.progress(doneCount, due.length)}
          </p>
        </div>
        {habits.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={de.habits.manage}
            onClick={() => setManageOpen(true)}
          >
            <Settings2 />
          </Button>
        )}
      </div>

      {habits.length === 0 ? (
        <Button
          variant="secondary"
          className="h-12 bg-habit/12 text-base font-semibold text-habit hover:bg-habit/20"
          onClick={() => setManageOpen(true)}
        >
          <Plus /> {de.habits.create}
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          {due.map((h) => (
            <HabitToggle key={h.tracker.id} trackerDay={h} date={date} entries={entries.data} />
          ))}
          {notDue.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              {de.habits.notDueToday}: {notDue.map((h) => h.tracker.name).join(', ')}
            </p>
          )}
        </div>
      )}
      <HabitsManageSheet habits={habits} open={manageOpen} onOpenChange={setManageOpen} />
    </Card>
  );
}
