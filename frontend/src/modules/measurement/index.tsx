import { useState } from 'react';
import { ChevronRight, Ruler, Settings2 } from 'lucide-react';
import type { Tracker, TrackerDay } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEntries } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';
import { formatMeasurement, historyRange, measurementConfig } from './measurement-utils';
import { MeasurementForm, MeasurementSheet } from './MeasurementSheet';
import { MeasurementsManageSheet } from './MeasurementsManageSheet';

function MeasurementRow({ tracker, date }: { tracker: Tracker; date: string }) {
  const [open, setOpen] = useState(false);
  const range = historyRange(date);
  const history = useEntries(tracker.id, range.from, range.to);
  const config = measurementConfig(tracker);
  const latest = history.data?.at(-1);
  const previous = history.data?.at(-2);
  const delta =
    latest?.value != null && previous?.value != null ? latest.value - previous.value : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={de.measurements.openTracker(tracker.name)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{tracker.name}</span>
        <span className="text-right">
          {latest?.value != null ? (
            <>
              <span className="text-lg font-semibold tabular-nums">
                {formatMeasurement(latest.value, config.decimals)}
                {typeof latest.data.secondary === 'number'
                  ? `/${formatMeasurement(latest.data.secondary, config.decimals)}`
                  : ''}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">{config.unit}</span>
              <span className="block text-xs text-muted-foreground">
                {latest.localDate !== date
                  ? de.measurements.since(
                      new Date(`${latest.localDate}T12:00:00`).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                      }),
                    )
                  : delta !== null && delta !== 0
                    ? `${delta > 0 ? '+' : '−'}${formatMeasurement(Math.abs(delta), config.decimals)} ${config.unit}`
                    : ' '}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{de.measurements.noValue}</span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <MeasurementSheet tracker={tracker} date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}

function MeasurementsWidget({ day, date }: WidgetProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const trackers = day.trackers.filter((t) => t.tracker.module === 'measurement');
  return (
    <Card className="gap-3">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-measurement/15">
          <Ruler className="size-5 text-measurement" />
        </div>
        <p className="flex-1 text-lg font-semibold">{de.measurements.title}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label={de.measurements.manage}
          onClick={() => setManageOpen(true)}
        >
          <Settings2 />
        </Button>
      </div>
      {trackers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{de.measurements.empty}</p>
      ) : (
        <div className="-mx-2 flex flex-col divide-y">
          {trackers.map((t) => (
            <MeasurementRow key={t.tracker.id} tracker={t.tracker} date={date} />
          ))}
        </div>
      )}
      <MeasurementsManageSheet
        trackers={trackers as TrackerDay[]}
        open={manageOpen}
        onOpenChange={setManageOpen}
      />
    </Card>
  );
}

function MeasurementQuickActions({ trackerDay, date }: TrackerUiProps) {
  return <MeasurementForm tracker={trackerDay.tracker} date={date} />;
}

export const measurementFrontend: FrontendModule = {
  id: 'measurement',
  formatValue: (v, tracker) => {
    const config = measurementConfig(tracker);
    return `${formatMeasurement(v, config.decimals)} ${config.unit}`;
  },
  widgets: { 'measurements.overview': MeasurementsWidget },
  QuickActions: MeasurementQuickActions,
};
