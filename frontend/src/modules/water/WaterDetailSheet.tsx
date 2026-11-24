import { useState, type FormEvent } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { WATER_MAX_ENTRY_ML, type Entry } from '@lifeos/shared';
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
  useDeleteEntry,
  useEntries,
  useToday,
  useUpdateEntry,
  useUpdateGoal,
  useUpdateTracker,
} from '@/features/tracking/tracking-api';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { formatLocalDate, formatNumber, formatTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { TrackerUiProps } from '../types';
import { waterConfig } from './water-config';

type Props = TrackerUiProps & { open: boolean; onOpenChange: (open: boolean) => void };

function parseMl(text: string): number | null {
  const value = Number(text.replace(/\s|ml/gi, '').replace(',', '.'));
  return Number.isInteger(value) && value >= 1 && value <= WATER_MAX_ENTRY_ML ? value : null;
}

export function WaterDetailSheet({ trackerDay, date, open, onOpenChange }: Props) {
  const today = useToday();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{trackerDay.tracker.name}</SheetTitle>
          <SheetDescription>
            {date === today ? de.today.title : formatLocalDate(date)}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <>
            <CustomAmount trackerId={trackerDay.tracker.id} date={date} />
            <EntryList trackerId={trackerDay.tracker.id} date={date} />
            <WaterSettings {...{ trackerDay, date }} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CustomAmount({ trackerId, date }: { trackerId: string; date: string }) {
  const [text, setText] = useState('');
  const quickAdd = useQuickAdd();
  const value = parseMl(text);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (value === null) return;
    quickAdd.add({
      date,
      trackerId,
      value,
      source: 'manual',
      message: de.water.added(formatNumber(value)),
    });
    setText('');
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="water-custom">{de.water.customAmount}</Label>
        <Input
          id="water-custom"
          inputMode="numeric"
          placeholder="z. B. 330"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={value === null}>
        {de.common.add}
      </Button>
    </form>
  );
}

function EntryList({ trackerId, date }: { trackerId: string; date: string }) {
  const entries = useEntries(trackerId, date);
  if (entries.isPending)
    return <p className="text-sm text-muted-foreground">{de.common.loading}</p>;
  if (entries.isError) return <p className="text-sm text-destructive">{de.common.error}</p>;

  return (
    <section aria-label={de.water.entries}>
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{de.water.entries}</h3>
      {entries.data.length === 0 ? (
        <p className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          {de.water.noEntries}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
          {[...entries.data].reverse().map((entry) => (
            <EntryRow key={entry.id} entry={entry} date={date} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryRow({ entry, date }: { entry: Entry; date: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(entry.value ?? ''));
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const value = parseMl(text);

  function save(event: FormEvent) {
    event.preventDefault();
    if (value === null) return;
    update.mutate(
      {
        id: entry.id,
        entry: {
          trackerId: entry.trackerId,
          occurredAt: entry.occurredAt,
          tzOffsetMin: entry.tzOffsetMin,
          value,
          data: entry.data,
          note: entry.note,
        },
      },
      { onSuccess: () => setEditing(false), onError: () => toast.error(de.common.notSaved) },
    );
  }

  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="w-12 text-sm tabular-nums text-muted-foreground">
        {formatTime(entry.occurredAt)}
      </span>
      {editing ? (
        <form onSubmit={save} className="flex flex-1 items-center gap-1">
          <Input
            aria-label={de.water.amountMl}
            inputMode="numeric"
            className="h-10"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            aria-label={de.common.save}
            disabled={value === null || update.isPending}
          >
            <Check />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={de.common.cancel}
            onClick={() => setEditing(false)}
          >
            <X />
          </Button>
        </form>
      ) : (
        <>
          <span className="flex-1 font-medium tabular-nums">
            {formatNumber(entry.value ?? 0)} ml
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={de.common.edit}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={de.common.delete}
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(
                { id: entry.id, date, trackerId: entry.trackerId, value: entry.value },
                { onError: () => toast.error(de.common.notSaved) },
              )
            }
          >
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  );
}

function WaterSettings({ trackerDay }: TrackerUiProps) {
  const today = useToday();
  const config = waterConfig(trackerDay);
  const [goalText, setGoalText] = useState(String(trackerDay.goal?.target ?? 2000));
  const [amountsText, setAmountsText] = useState(config.quickAmounts.join(', '));
  const updateGoal = useUpdateGoal();
  const updateTracker = useUpdateTracker();

  const goal = Number(goalText);
  const goalValid = Number.isInteger(goal) && goal >= 100 && goal <= 10_000;
  const amounts = amountsText
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number);
  const amountsValid =
    amounts.length >= 1 &&
    amounts.length <= 4 &&
    amounts.every((a) => Number.isInteger(a) && a >= 10 && a <= 2000);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!goalValid || !amountsValid) return;
    const tasks: Promise<unknown>[] = [];
    if (goal !== trackerDay.goal?.target) {
      tasks.push(
        updateGoal.mutateAsync({
          trackerId: trackerDay.tracker.id,
          target: goal,
          effectiveFrom: today,
        }),
      );
    }
    if (amounts.join() !== config.quickAmounts.join()) {
      tasks.push(
        updateTracker.mutateAsync({
          id: trackerDay.tracker.id,
          update: { config: { ...config, quickAmounts: amounts } },
        }),
      );
    }
    Promise.all(tasks).then(
      () => tasks.length > 0 && toast.success(de.common.saved),
      () => toast.error(de.common.notSaved),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t pt-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{de.settings.title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="water-goal">{de.water.dailyGoal}</Label>
          <Input
            id="water-goal"
            inputMode="numeric"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            aria-invalid={!goalValid || undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="water-amounts">{de.water.quickAmounts}</Label>
          <Input
            id="water-amounts"
            value={amountsText}
            onChange={(e) => setAmountsText(e.target.value)}
            aria-invalid={!amountsValid || undefined}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{de.water.settingsHint}</p>
      <Button
        type="submit"
        variant="secondary"
        disabled={!goalValid || !amountsValid || updateGoal.isPending || updateTracker.isPending}
      >
        {de.common.save}
      </Button>
    </form>
  );
}
