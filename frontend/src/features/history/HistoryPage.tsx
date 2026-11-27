import { useInfiniteQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { addDays, type History, type HistoryDay, type Tracker } from '@lifeos/shared';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToday, useTrackers } from '@/features/tracking/tracking-api';
import { api } from '@/lib/api';
import { formatDecimal, formatLocalDate } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { getFrontendModule } from '@/modules/registry';

const PAGE_DAYS = 14;

const DOT: Record<string, string> = {
  water: 'bg-water',
  sleep: 'bg-sleep',
  mood: 'bg-mood',
  habit: 'bg-habit',
  activity: 'bg-activity',
  meal: 'bg-meal',
  measurement: 'bg-measurement',
  symptom: 'bg-symptom',
  focus: 'bg-focus',
  custom: 'bg-custom',
};

function dayLine(item: HistoryDay['trackers'][number], tracker: Tracker): string {
  const module = getFrontendModule(tracker.module);
  if (module?.formatDay) return module.formatDay(item, tracker);
  if (item.value === null) return tracker.name;
  const value = module?.formatValue
    ? module.formatValue(item.value, tracker)
    : formatDecimal(item.value);
  return `${tracker.name} ${value}`;
}

/** All recorded days, newest first; tapping a day opens it on the dashboard. */
export function HistoryPage() {
  const today = useToday();
  const trackers = useTrackers();
  const history = useInfiniteQuery({
    queryKey: [...queryKeys.history, today],
    initialPageParam: today,
    queryFn: ({ pageParam, signal }) =>
      api<History>(`/history?from=${addDays(pageParam, -(PAGE_DAYS - 1))}&to=${pageParam}`, {
        signal,
      }),
    getNextPageParam: (last, _all, lastParam) =>
      last.hasMoreBefore ? addDays(lastParam, -PAGE_DAYS) : undefined,
  });

  const days = history.data?.pages.flatMap((p) => p.days) ?? [];
  const byId = new Map((trackers.data ?? []).map((t) => [t.id, t]));

  const label = (date: string) =>
    date === today
      ? de.history.today
      : date === addDays(today, -1)
        ? de.history.yesterday
        : formatLocalDate(date);

  return (
    <>
      <PageHeader title={de.history.title} />
      {history.isSuccess && days.length === 0 && !history.hasNextPage ? (
        <EmptyState icon={CalendarDays} text={de.history.empty} />
      ) : (
        <div className="flex flex-col gap-3">
          {history.isSuccess && days.length === 0 && (
            <p className="text-sm text-muted-foreground">{de.history.emptyRange}</p>
          )}
          {days.map((day) => (
            <Link
              key={day.date}
              to={day.date === today ? '/' : `/?tag=${day.date}`}
              aria-label={de.history.open(label(day.date))}
              className="rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="gap-3 transition-colors hover:bg-accent/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{label(day.date)}</p>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                  {day.trackers.map((item) => {
                    const tracker = byId.get(item.trackerId);
                    if (!tracker) return null;
                    return (
                      <li key={item.trackerId} className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            DOT[tracker.color ?? ''] ?? 'bg-primary',
                          )}
                        />
                        <span className="tabular-nums">{dayLine(item, tracker)}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Link>
          ))}
          {history.hasNextPage ? (
            <Button
              variant="outline"
              onClick={() => void history.fetchNextPage()}
              disabled={history.isFetchingNextPage}
            >
              {history.isFetchingNextPage ? de.common.loading : de.history.loadMore}
            </Button>
          ) : (
            days.length > 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">{de.history.noMore}</p>
            )
          )}
        </div>
      )}
    </>
  );
}
