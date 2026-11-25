import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ACTIVITY_INTENSITIES, activityConfigSchema, type TrackerDay } from '@lifeos/shared';
import { ChipGroup } from '@/components/ChipGroup';
import { DurationPicker } from '@/components/tracking/DurationPicker';
import { EntryList } from '@/components/tracking/EntryList';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newEntryId, useAddEntry, useDayStart, useEntries } from '@/features/tracking/tracking-api';
import { entryMomentFor } from '@/lib/entry-time';
import { formatDecimal, formatDuration } from '@/lib/format';
import { de } from '@/lib/i18n/de';

const ACCENT = 'bg-activity text-white';

export function ActivitySheet({
  trackerDay,
  date,
  open,
  onOpenChange,
}: {
  trackerDay: TrackerDay;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const entries = useEntries(open ? trackerDay.tracker.id : '', date);
  return (
    <ModuleSheet
      title={trackerDay.tracker.name}
      date={date}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ActivityForm trackerDay={trackerDay} date={date} onSaved={() => onOpenChange(false)} />
      <EntryList
        title={de.activity.entries}
        entries={entries.data}
        date={date}
        render={(e) => (
          <>
            <p className="font-medium">
              {String(e.data.type)} · {formatDuration(e.value ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {de.activity.intensityShort[Number(e.data.intensity) - 1]}
              {typeof e.data.distanceKm === 'number'
                ? ` · ${formatDecimal(e.data.distanceKm)} km`
                : ''}
            </p>
          </>
        )}
      />
    </ModuleSheet>
  );
}

function ActivityForm({
  trackerDay,
  date,
  onSaved,
}: {
  trackerDay: TrackerDay;
  date: string;
  onSaved: () => void;
}) {
  const config = activityConfigSchema.safeParse(trackerDay.tracker.config);
  const types = config.success ? config.data.types : activityConfigSchema.parse({}).types;
  const [type, setType] = useState<string>();
  const [minutes, setMinutes] = useState<number | undefined>(30);
  const [intensity, setIntensity] = useState<number>(2);
  const [distance, setDistance] = useState('');
  const add = useAddEntry();
  const dayStart = useDayStart();

  const km = distance ? Number(distance.replace(',', '.')) : undefined;
  const kmValid = km === undefined || (Number.isFinite(km) && km > 0 && km <= 1000);
  const valid = type !== undefined && minutes !== undefined && minutes <= 1440 && kmValid;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !type || !minutes) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: trackerDay.tracker.id,
          ...entryMomentFor(date, dayStart),
          value: minutes,
          data: { type, intensity, ...(km !== undefined ? { distanceKm: km } : {}) },
        },
      },
      {
        onSuccess: () => {
          toast.success(de.activity.saved(type, formatDuration(minutes)));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{de.activity.type}</Label>
        <ChipGroup
          label={de.activity.type}
          options={types.map((t) => ({ value: t, label: t }))}
          value={type}
          onChange={setType}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.activity.duration}</Label>
        <DurationPicker
          label={de.activity.duration}
          presets={[15, 30, 45, 60, 90]}
          value={minutes}
          onChange={setMinutes}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.activity.intensity}</Label>
        <ChipGroup
          label={de.activity.intensity}
          options={ACTIVITY_INTENSITIES.map((i) => ({ value: i.value, label: i.label }))}
          value={intensity}
          onChange={setIntensity}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="activity-distance">{de.activity.distance}</Label>
        <Input
          id="activity-distance"
          inputMode="decimal"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          aria-invalid={!kmValid || undefined}
        />
      </div>
      <Button type="submit" size="lg" disabled={!valid || add.isPending}>
        {de.activity.save}
      </Button>
    </form>
  );
}
