import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { isHabitDue, habitConfigSchema } from '@lifeos/shared';
import { de } from '@/lib/i18n/de';
import { getFrontendModule } from '@/modules/registry';
import { useDay, useToday } from './tracking-api';

interface QuickAddContextValue {
  open: (date?: string) => void;
}

const QuickAddContext = createContext<QuickAddContextValue>({ open: () => undefined });

export function useQuickAddSheet(): QuickAddContextValue {
  return useContext(QuickAddContext);
}

/** Global "+" sheet: all trackers with quick actions, for today (or the day being viewed). */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const [state, setState] = useState<{ open: boolean; date: string | null }>({
    open: false,
    date: null,
  });
  const value = useMemo(
    () => ({ open: (date?: string) => setState({ open: true, date: date ?? null }) }),
    [],
  );
  const date = state.date ?? today;

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <Sheet open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{de.quickAdd.title}</SheetTitle>
            <SheetDescription>{de.quickAdd.description}</SheetDescription>
          </SheetHeader>
          {state.open && <QuickAddList date={date} />}
        </SheetContent>
      </Sheet>
    </QuickAddContext.Provider>
  );
}

function QuickAddList({ date }: { date: string }) {
  const day = useDay(date);
  if (day.isPending) return <p className="text-sm text-muted-foreground">{de.common.loading}</p>;
  if (day.isError) return <p className="text-sm text-destructive">{de.today.loadError}</p>;

  const withActions = day.data.trackers
    .map((trackerDay) => ({
      trackerDay,
      QuickActions: getFrontendModule(trackerDay.tracker.module)?.QuickActions,
    }))
    .filter((i) => i.QuickActions);
  const isHabit = (i: (typeof withActions)[number]) => i.trackerDay.tracker.module === 'habit';
  const items = withActions.filter((i) => !isHabit(i));
  // Habits are grouped under one heading; only those due on this day.
  const habits = withActions.filter(
    (i) =>
      isHabit(i) && isHabitDue(habitConfigSchema.parse(i.trackerDay.tracker.config ?? {}), date),
  );

  if (items.length === 0 && habits.length === 0)
    return <p className="text-sm text-muted-foreground">{de.quickAdd.empty}</p>;

  return (
    <ul className="flex flex-col gap-5">
      {items.map(({ trackerDay, QuickActions }) => (
        <li key={trackerDay.tracker.id} className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{trackerDay.tracker.name}</p>
          {QuickActions && <QuickActions trackerDay={trackerDay} date={date} />}
        </li>
      ))}
      {habits.length > 0 && (
        <li className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{de.habits.title}</p>
          {habits.map(({ trackerDay, QuickActions }) =>
            QuickActions ? (
              <QuickActions key={trackerDay.tracker.id} trackerDay={trackerDay} date={date} />
            ) : null,
          )}
        </li>
      )}
    </ul>
  );
}
