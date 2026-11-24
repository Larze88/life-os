import {
  Activity,
  CalendarRange,
  Droplet,
  ListChecks,
  Moon,
  Smile,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { formatLongDay } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';

function greeting(hour: number): string {
  if (hour < 11) return de.today.greetingMorning;
  if (hour >= 18) return de.today.greetingEvening;
  return de.today.greetingDay;
}

const plannedWidgets: { label: string; icon: LucideIcon; color: string }[] = [
  { label: de.widgets.water, icon: Droplet, color: 'text-water bg-water/12' },
  { label: de.widgets.sleep, icon: Moon, color: 'text-sleep bg-sleep/12' },
  { label: de.widgets.mood, icon: Smile, color: 'text-mood bg-mood/15' },
  { label: de.widgets.habits, icon: ListChecks, color: 'text-habit bg-habit/12' },
  { label: de.widgets.activity, icon: Activity, color: 'text-activity bg-activity/12' },
  { label: de.widgets.week, icon: CalendarRange, color: 'text-measurement bg-measurement/12' },
];

/** Dashboard placeholder until the widget system arrives in phase 2. */
export function TodayPage() {
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow={formatLongDay(now)} title={greeting(now.getHours())} />

      <Card className="mb-8">
        <CardTitle className="text-lg">{de.today.emptyTitle}</CardTitle>
        <CardDescription className="text-[15px] leading-relaxed">
          {de.today.emptyText}
        </CardDescription>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {de.today.upcoming}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {plannedWidgets.map(({ label, icon: Icon, color }) => (
          <Card key={label} className="gap-3 p-4" aria-disabled="true">
            <div className="flex items-start justify-between gap-2">
              <div className={cn('flex size-10 items-center justify-center rounded-full', color)}>
                <Icon className="size-5" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {de.today.soon}
              </span>
            </div>
            <span className="truncate font-medium">{label}</span>
          </Card>
        ))}
      </div>
    </>
  );
}
