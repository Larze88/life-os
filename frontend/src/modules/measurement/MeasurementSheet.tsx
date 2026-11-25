import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Tracker } from '@lifeos/shared';
import { EntryList } from '@/components/tracking/EntryList';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newEntryId, useAddEntry, useDayStart, useEntries } from '@/features/tracking/tracking-api';
import { entryMomentFor } from '@/lib/entry-time';
import { de } from '@/lib/i18n/de';
import {
  formatMeasurement,
  historyRange,
  measurementConfig,
  parseMeasurement,
} from './measurement-utils';

/** Inline form: value (+ optional second value) and save. Used in the sheet and quick-add. */
export function MeasurementForm({
  tracker,
  date,
  onSaved,
}: {
  tracker: Tracker;
  date: string;
  onSaved?: () => void;
}) {
  const config = measurementConfig(tracker);
  const [text, setText] = useState('');
  const [secondText, setSecondText] = useState('');
  const add = useAddEntry();
  const dayStart = useDayStart();
  const value = parseMeasurement(text);
  const secondary = parseMeasurement(secondText);
  const valid = value !== undefined && (secondText === '' || secondary !== undefined);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || value === undefined) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: tracker.id,
          ...entryMomentFor(date, dayStart),
          value,
          data: secondary !== undefined ? { secondary } : {},
        },
      },
      {
        onSuccess: () => {
          toast.success(de.measurements.saved(tracker.name));
          setText('');
          setSecondText('');
          onSaved?.();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor={`m-${tracker.id}`}>{de.measurements.value(config.unit)}</Label>
        <Input
          id={`m-${tracker.id}`}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {config.secondaryLabel && (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor={`m2-${tracker.id}`}>
            {de.measurements.secondary(config.secondaryLabel, config.unit)}
          </Label>
          <Input
            id={`m2-${tracker.id}`}
            inputMode="decimal"
            value={secondText}
            onChange={(e) => setSecondText(e.target.value)}
          />
        </div>
      )}
      <Button type="submit" disabled={!valid || add.isPending}>
        {de.measurements.save}
      </Button>
    </form>
  );
}

export function MeasurementSheet({
  tracker,
  date,
  open,
  onOpenChange,
}: {
  tracker: Tracker;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const config = measurementConfig(tracker);
  const range = historyRange(date);
  const history = useEntries(open ? tracker.id : '', range.from, range.to);
  return (
    <ModuleSheet title={tracker.name} date={date} open={open} onOpenChange={onOpenChange}>
      <MeasurementForm tracker={tracker} date={date} />
      <EntryList
        title={de.measurements.history}
        showDate
        entries={history.data?.slice(-15)}
        render={(e) => (
          <p className="font-medium tabular-nums">
            {formatMeasurement(e.value ?? 0, config.decimals)}
            {typeof e.data.secondary === 'number'
              ? ` / ${formatMeasurement(e.data.secondary, config.decimals)}`
              : ''}{' '}
            {config.unit}
          </p>
        )}
      />
    </ModuleSheet>
  );
}
