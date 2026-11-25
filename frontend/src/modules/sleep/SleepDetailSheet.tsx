import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SLEEP_MAX_MINUTES } from '@lifeos/shared';
import { ScalePicker, numericScale } from '@/components/ScalePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  newEntryId,
  useAddEntry,
  useDeleteEntry,
  useEntries,
} from '@/features/tracking/tracking-api';
import { formatDuration, formatLocalDate } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { TrackerUiProps } from '../types';
import { sleepPeriod, timeOf } from './sleep-times';

type Props = TrackerUiProps & { open: boolean; onOpenChange: (open: boolean) => void };

const qualityScale = numericScale(de.sleep.qualityLow, de.sleep.qualityHigh);
const restedScale = numericScale(de.sleep.restedLow, de.sleep.restedHigh);

export function SleepDetailSheet({ trackerDay, date, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{trackerDay.tracker.name}</SheetTitle>
          <SheetDescription>{formatLocalDate(date)}</SheetDescription>
        </SheetHeader>
        {open && (
          <>
            <SleepForm
              trackerId={trackerDay.tracker.id}
              date={date}
              onSaved={() => onOpenChange(false)}
            />
            <SleepEntries trackerId={trackerDay.tracker.id} date={date} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SleepForm({
  trackerId,
  date,
  onSaved,
}: {
  trackerId: string;
  date: string;
  onSaved: () => void;
}) {
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState<number>();
  const [rested, setRested] = useState<number>();
  const add = useAddEntry();

  const valid = /^\d{2}:\d{2}$/.test(bedtime) && /^\d{2}:\d{2}$/.test(wakeTime);
  const period = valid ? sleepPeriod(date, bedtime, wakeTime) : null;
  const tooLong = period !== null && period.minutes > SLEEP_MAX_MINUTES;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!period || tooLong || quality === undefined) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId,
          occurredAt: period.occurredAt,
          endsAt: period.endsAt,
          tzOffsetMin: period.tzOffsetMin,
          value: period.minutes,
          data: { quality, rested },
        },
      },
      {
        onSuccess: () => {
          toast.success(de.sleep.saved(formatDuration(period.minutes)));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sleep-bed">{de.sleep.bedtime}</Label>
          <Input
            id="sleep-bed"
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sleep-wake">{de.sleep.wakeTime}</Label>
          <Input
            id="sleep-wake"
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {tooLong ? (
          <span className="text-destructive">{de.sleep.tooLong}</span>
        ) : period ? (
          <>
            {de.sleep.duration}:{' '}
            <span className="font-semibold text-foreground">{formatDuration(period.minutes)}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-col gap-2">
        <Label>{de.sleep.quality}</Label>
        <ScalePicker
          label={de.sleep.quality}
          options={qualityScale}
          value={quality}
          onChange={setQuality}
          accentClass="bg-sleep text-white"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.sleep.rested}</Label>
        <ScalePicker
          label={de.sleep.rested}
          options={restedScale}
          value={rested}
          onChange={(v) => setRested(v === rested ? undefined : v)}
          accentClass="bg-sleep text-white"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={!period || tooLong || quality === undefined || add.isPending}
      >
        {de.sleep.save}
      </Button>
    </form>
  );
}

function SleepEntries({ trackerId, date }: { trackerId: string; date: string }) {
  const entries = useEntries(trackerId, date);
  const remove = useDeleteEntry();
  if (!entries.data || entries.data.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 border-t pt-4" aria-label={de.sleep.entries}>
      <h3 className="text-sm font-semibold text-muted-foreground">{de.sleep.entries}</h3>
      <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
        {entries.data.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium tabular-nums">
                {timeOf(entry.occurredAt)} – {entry.endsAt ? timeOf(entry.endsAt) : '?'} ·{' '}
                {formatDuration(entry.value ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {de.sleep.qualityShort(Number(entry.data.quality ?? 0))}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={de.common.delete}
              onClick={() => remove.mutate({ id: entry.id, date, trackerId, value: entry.value })}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
