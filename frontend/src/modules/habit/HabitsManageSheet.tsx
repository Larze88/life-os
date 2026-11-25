import { useState, type FormEvent } from 'react';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { TrackerDay } from '@lifeos/shared';
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
import { useArchiveTracker, useCreateTracker } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import { habitConfig, scheduleText } from './habit-utils';

export function HabitsManageSheet({
  habits,
  open,
  onOpenChange,
}: {
  habits: TrackerDay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const archive = useArchiveTracker();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{de.habits.manage}</SheetTitle>
          <SheetDescription>{de.habits.title}</SheetDescription>
        </SheetHeader>
        {open && <CreateHabitForm />}
        {habits.length > 0 && (
          <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
            {habits.map((h) => (
              <li key={h.tracker.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{h.tracker.name}</p>
                  <p className="text-xs text-muted-foreground">{scheduleText(habitConfig(h))}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (!window.confirm(de.habits.archiveConfirm(h.tracker.name))) return;
                    archive.mutate(h.tracker.id, {
                      onSuccess: () => toast(de.habits.archived),
                      onError: () => toast.error(de.common.notSaved),
                    });
                  }}
                >
                  <Archive /> {de.habits.archive}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreateHabitForm() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'daily' | 'weekdays'>('daily');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(1);
  const create = useCreateTracker();

  const valid = name.trim().length > 0 && (mode === 'daily' || days.length > 0);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const trimmed = name.trim();
    create.mutate(
      {
        module: 'habit',
        name: trimmed,
        config: {
          schedule:
            mode === 'daily' ? { type: 'daily' } : { type: 'weekdays', days: [...days].sort() },
          targetPerDay: times,
        },
      },
      {
        onSuccess: () => {
          toast.success(de.habits.created(trimmed));
          setName('');
          setTimes(1);
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="habit-name">{de.habits.name}</Label>
        <Input
          id="habit-name"
          maxLength={60}
          placeholder={de.habits.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.habits.schedule}</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={de.habits.schedule}>
          {(['daily', 'weekdays'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'h-11 rounded-xl bg-secondary text-sm font-medium',
                mode === m && 'bg-habit text-white',
              )}
            >
              {m === 'daily' ? de.habits.daily : de.habits.weekdays}
            </button>
          ))}
        </div>
        {mode === 'weekdays' && (
          <div className="grid grid-cols-7 gap-1.5">
            {de.habits.weekdayShort.map((label, i) => {
              const d = i + 1;
              const on = days.includes(d);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'h-11 rounded-xl bg-secondary text-sm font-medium',
                    on && 'bg-habit/80 text-white',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.habits.timesPerDay}</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="−"
            disabled={times <= 1}
            onClick={() => setTimes((t) => t - 1)}
          >
            −
          </Button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
            {times}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="+"
            disabled={times >= 10}
            onClick={() => setTimes((t) => t + 1)}
          >
            +
          </Button>
        </div>
      </div>
      <Button type="submit" size="lg" disabled={!valid || create.isPending}>
        {de.habits.create}
      </Button>
    </form>
  );
}
