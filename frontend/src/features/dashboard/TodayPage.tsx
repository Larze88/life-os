import { useSearchParams } from 'react-router';
import { isLocalDate } from '@lifeos/shared';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDay, useToday } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import { getWidgetComponent } from '@/modules/registry';
import { DayNavigator } from './DayNavigator';

function greeting(hour: number): string {
  if (hour < 11) return de.today.greetingMorning;
  if (hour >= 18) return de.today.greetingEvening;
  return de.today.greetingDay;
}

const sizeClass = { sm: '', md: '', lg: 'md:col-span-2' } as const;

/** Dashboard: widgets for one logical day (?tag=YYYY-MM-DD, default today). */
export function TodayPage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tag');
  const date = requested && isLocalDate(requested) && requested <= today ? requested : today;
  const day = useDay(date);

  const setDate = (next: string) =>
    setParams(next === today ? {} : { tag: next }, { replace: true });

  return (
    <>
      <PageHeader title={date === today ? greeting(new Date().getHours()) : de.today.pastDay} />
      <div className="-mt-3 mb-5">
        <DayNavigator date={date} today={today} onChange={setDate} />
      </div>

      {day.isPending && <WidgetSkeleton />}
      {day.isError && (
        <Card className="items-center text-center">
          <p className="text-sm text-muted-foreground">{de.today.loadError}</p>
          <Button variant="outline" onClick={() => void day.refetch()}>
            {de.common.retry}
          </Button>
        </Card>
      )}
      {day.isSuccess && (
        <div className="grid gap-4 md:grid-cols-2">
          {day.data.widgets.length === 0 && (
            <p className="text-sm text-muted-foreground">{de.today.noWidgets}</p>
          )}
          {day.data.widgets.map((widget) => {
            const Component = getWidgetComponent(widget.widgetType);
            if (!Component) return null;
            const trackerDay = day.data.trackers.find((t) => t.tracker.id === widget.trackerId);
            return (
              <div key={widget.id} className={cn(sizeClass[widget.size])}>
                <Component widget={widget} trackerDay={trackerDay} date={date} />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">{de.today.upcomingModules}</p>
    </>
  );
}

function WidgetSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden>
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
