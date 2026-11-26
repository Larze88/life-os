import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  addDays,
  isZeroWhenMissing,
  moduleRegistry,
  type StatsSeries,
  type Tracker,
} from '@lifeos/shared';
import { ChipGroup } from '@/components/ChipGroup';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { useToday, useTrackers } from '@/features/tracking/tracking-api';
import { formatDecimal } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { moduleChipClass, moduleTextClass } from '@/lib/module-colors';
import { cn } from '@/lib/utils';
import { getFrontendModule } from '@/modules/registry';
import { granularityFor, toChartPoints, type ChartPoint } from './buckets';
import { CorrelationCard } from './CorrelationCard';
import { DailyChart } from './DailyChart';
import { useStatsSeries } from './stats-api';

const PERIODS = [7, 30, 90, 365] as const;
const dayFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' });

export function StatsPage() {
  const trackers = useTrackers();
  const today = useToday();
  const [selectedId, setTrackerId] = useState<string>();
  const [period, setPeriod] = useState<number>(30);

  const list = useMemo(
    () => (trackers.data ?? []).filter((tr) => moduleRegistry.get(tr.module)),
    [trackers.data],
  );
  // Default: first tracker (derived, no effect needed).
  const trackerId = selectedId ?? list[0]?.id;

  const from = addDays(today, -(period - 1));
  const prevFrom = addDays(from, -period);
  const prevTo = addDays(from, -1);
  const tracker = list.find((tr) => tr.id === trackerId);
  const series = useStatsSeries(trackerId, from, today);
  const previous = useStatsSeries(period <= 183 ? trackerId : undefined, prevFrom, prevTo);

  return (
    <>
      <PageHeader title={de.stats.title} />
      {trackers.isSuccess && list.length === 0 ? (
        <EmptyState icon={BarChart3} text={de.stats.empty} />
      ) : (
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label={de.stats.tracker}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          >
            {list.map((tr) => (
              <button
                key={tr.id}
                type="button"
                role="radio"
                aria-checked={tr.id === trackerId}
                onClick={() => setTrackerId(tr.id)}
                className={cn(
                  'h-10 shrink-0 rounded-full bg-secondary px-4 text-sm font-medium',
                  tr.id === trackerId && moduleChipClass(tr.color),
                )}
              >
                {tr.name}
              </button>
            ))}
          </div>
          <ChipGroup
            label={de.stats.period}
            options={PERIODS.map((p) => ({ value: p, label: de.stats.periods[p]! }))}
            value={period}
            onChange={setPeriod}
          />

          {tracker && series.data && (
            <TrackerStats
              tracker={tracker}
              series={series.data}
              previous={previous.data}
              periodDays={period}
            />
          )}
          {list.length >= 2 && <CorrelationCard trackers={list} from={from} to={today} />}
        </div>
      )}
    </>
  );
}

function TrackerStats({
  tracker,
  series,
  previous,
  periodDays,
}: {
  tracker: Tracker;
  series: StatsSeries;
  previous: StatsSeries | undefined;
  periodDays: number;
}) {
  const module = moduleRegistry.require(tracker.module);
  const fmt = getFrontendModule(tracker.module)?.formatValue;
  const format = (v: number) => (fmt ? fmt(v, tracker) : formatDecimal(v));
  const granularity = granularityFor(periodDays);
  const points = toChartPoints(series.days, granularity, isZeroWhenMissing(module));
  const kind = series.aggregate === 'sum' || series.aggregate === 'count' ? 'bar' : 'line';
  const { summary } = series;

  const formatDate = (p: ChartPoint) => {
    const d = new Date(`${p.date}T12:00:00`);
    if (granularity === 'month') return monthFmt.format(d);
    if (granularity === 'week') return `Woche ab ${dayFmt.format(d)}`;
    return dayFmt.format(d);
  };

  const change =
    previous?.summary.average != null && summary.average != null && previous.summary.average !== 0
      ? (summary.average - previous.summary.average) / Math.abs(previous.summary.average)
      : null;

  if (summary.daysWithData === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{de.stats.noData}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{de.stats.perDay}</p>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {summary.average != null ? format(summary.average) : '–'}
            </p>
          </div>
          {change !== null && (
            <p className="text-right text-xs text-muted-foreground">
              {Math.abs(change) < 0.005
                ? de.stats.noChange
                : de.stats.vsPrevious(
                    `${change > 0 ? '+' : '−'}${formatDecimal(Math.abs(change) * 100, 0)} %`,
                  )}
            </p>
          )}
        </div>
        <DailyChart
          points={points}
          kind={kind}
          colorClass={moduleTextClass(tracker.color)}
          goal={granularity === 'day' || series.aggregate !== 'count' ? series.goalTarget : null}
          format={format}
          formatAxis={(v) =>
            Math.abs(v) >= 1000 ? `${formatDecimal(v / 1000)}k` : formatDecimal(v)
          }
          label={de.stats.chartLabel(tracker.name, de.stats.periods[periodDays]!)}
          formatDate={formatDate}
        />
        {granularity !== 'day' && (
          <p className="text-xs text-muted-foreground">{de.stats.perDayHint[granularity]}</p>
        )}
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        {summary.max !== null && <Tile label={de.stats.highest} value={format(summary.max)} />}
        {summary.min !== null && kind === 'line' && (
          <Tile label={de.stats.lowest} value={format(summary.min)} />
        )}
        <Tile label={de.stats.daysWithData} value={`${summary.daysWithData}`} />
        {summary.goal && (
          <Tile
            label={de.stats.goalMet}
            value={de.stats.goalMetValue(summary.goal.met, summary.goal.evaluated)}
          />
        )}
        {series.streak && (
          <Tile
            label={de.stats.streak}
            value={de.stats.streakValue(series.streak.current, series.streak.longest)}
          />
        )}
      </div>

      <details className="rounded-2xl bg-card p-4 text-sm ring-1 ring-border/60">
        <summary className="cursor-pointer font-medium">{de.stats.table}</summary>
        <table className="mt-3 w-full">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">{de.stats.date}</th>
              <th className="py-1 text-right font-medium">{de.stats.value}</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.date} className="border-t">
                <td className="py-1.5">{formatDate(p)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {p.value === null ? '–' : format(p.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
