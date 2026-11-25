import { useState, type FormEvent } from 'react';
import { Pause, Play, Plus, Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { tzOffsetMinutes, type TrackerDay } from '@lifeos/shared';
import { ScalePicker, numericScale } from '@/components/ScalePicker';
import { DurationPicker } from '@/components/tracking/DurationPicker';
import { EntryList } from '@/components/tracking/EntryList';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { WidgetHeader } from '@/components/tracking/WidgetHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  newEntryId,
  useAddEntry,
  useDayStart,
  useEntries,
  useToday,
} from '@/features/tracking/tracking-api';
import { entryMomentFor } from '@/lib/entry-time';
import { formatDuration } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';
import { formatElapsed, useFocusTimer } from './focus-timer';

const ACCENT = 'bg-focus text-white';
const ratingScale = numericScale(de.focus.low, de.focus.high);

function FocusForm({
  trackerDay,
  date,
  timerStart,
  initialMinutes,
  onSaved,
}: {
  trackerDay: TrackerDay;
  date: string;
  timerStart?: string | null;
  initialMinutes?: number;
  onSaved: () => void;
}) {
  const [minutes, setMinutes] = useState<number | undefined>(initialMinutes ?? 25);
  const [concentration, setConcentration] = useState<number>();
  const [productivity, setProductivity] = useState<number>();
  const [task, setTask] = useState('');
  const add = useAddEntry();
  const dayStart = useDayStart();
  const valid = minutes !== undefined && minutes <= 16 * 60;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !minutes) return;
    // A timer session is recorded at its start time; manual entries "now" (or noon of past days).
    const moment = timerStart
      ? { occurredAt: timerStart, tzOffsetMin: tzOffsetMinutes(new Date(timerStart)) }
      : entryMomentFor(date, dayStart);
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: trackerDay.tracker.id,
          ...moment,
          value: minutes,
          data: { concentration, productivity, ...(task.trim() ? { task: task.trim() } : {}) },
        },
      },
      {
        onSuccess: () => {
          toast.success(de.focus.saved(formatDuration(minutes)));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  const toggle =
    (setter: (v: number | undefined) => void, current: number | undefined) => (v: number) =>
      setter(v === current ? undefined : v);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{de.focus.duration}</Label>
        <DurationPicker
          label={de.focus.duration}
          presets={[25, 50, 90]}
          value={minutes}
          onChange={setMinutes}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="focus-task">{de.focus.task}</Label>
        <Input
          id="focus-task"
          maxLength={100}
          placeholder={de.focus.taskPlaceholder}
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.focus.concentration}</Label>
        <ScalePicker
          label={de.focus.concentration}
          options={ratingScale}
          value={concentration}
          onChange={toggle(setConcentration, concentration)}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.focus.productivity}</Label>
        <ScalePicker
          label={de.focus.productivity}
          options={ratingScale}
          value={productivity}
          onChange={toggle(setProductivity, productivity)}
          accentClass={ACCENT}
        />
      </div>
      <Button type="submit" size="lg" disabled={!valid || add.isPending}>
        {de.focus.save}
      </Button>
    </form>
  );
}

function FocusSheet({
  trackerDay,
  date,
  open,
  onOpenChange,
  timerStart,
  initialMinutes,
  onSaved,
}: TrackerUiProps & {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  timerStart?: string | null;
  initialMinutes?: number;
  onSaved?: () => void;
}) {
  const entries = useEntries(open ? trackerDay.tracker.id : '', date);
  return (
    <ModuleSheet
      title={trackerDay.tracker.name}
      date={date}
      open={open}
      onOpenChange={onOpenChange}
    >
      <FocusForm
        trackerDay={trackerDay}
        date={date}
        timerStart={timerStart}
        initialMinutes={initialMinutes}
        onSaved={() => {
          onSaved?.();
          onOpenChange(false);
        }}
      />
      <EntryList
        title={de.focus.entries}
        entries={entries.data}
        date={date}
        render={(e) => (
          <>
            <p className="font-medium">
              {formatDuration(e.value ?? 0)}
              {e.data.task ? ` · ${String(e.data.task)}` : ''}
            </p>
            {(e.data.concentration || e.data.productivity) && (
              <p className="text-xs text-muted-foreground">
                {[
                  e.data.concentration ? `Konzentration ${String(e.data.concentration)}` : null,
                  e.data.productivity ? `Produktivität ${String(e.data.productivity)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </>
        )}
      />
    </ModuleSheet>
  );
}

function FocusActions({ trackerDay, date }: TrackerUiProps) {
  const timer = useFocusTimer();
  const today = useToday();
  const [sheet, setSheet] = useState<'manual' | 'timer' | null>(null);
  const timerMinutes = Math.max(1, Math.round(timer.elapsedMs / 60_000));

  return (
    <>
      {timer.startedAt ? (
        <div className="flex flex-col gap-2 rounded-xl bg-focus/10 p-3">
          <p className="text-center text-sm text-muted-foreground">
            {de.focus.running}{' '}
            <span className="font-mono text-2xl font-semibold tabular-nums text-focus">
              {formatElapsed(timer.elapsedMs)}
            </span>
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button
              className={`h-12 ${ACCENT} hover:bg-focus/90`}
              onClick={() => setSheet('timer')}
            >
              <Pause /> {de.focus.stopTimer}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-12"
              aria-label={de.focus.discardTimer}
              onClick={timer.clear}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-12 bg-focus/12 text-base font-semibold text-focus hover:bg-focus/20"
            disabled={date !== today}
            onClick={timer.start}
          >
            <Play /> {de.focus.startTimer}
          </Button>
          <Button
            variant="secondary"
            className="h-12 text-base font-semibold"
            onClick={() => setSheet('manual')}
          >
            <Plus /> {de.focus.add}
          </Button>
        </div>
      )}
      <FocusSheet
        trackerDay={trackerDay}
        date={date}
        open={sheet !== null}
        onOpenChange={(o) => !o && setSheet(null)}
        timerStart={sheet === 'timer' ? timer.startedAt : null}
        initialMinutes={sheet === 'timer' ? timerMinutes : undefined}
        onSaved={sheet === 'timer' ? timer.clear : undefined}
      />
    </>
  );
}

function FocusWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  if (!trackerDay) return null;
  const minutes = trackerDay.value ?? 0;
  return (
    <Card className="gap-4">
      <WidgetHeader
        onClick={() => setOpen(true)}
        label={de.focus.openDetails}
        title={trackerDay.tracker.name}
        visual={
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-focus/12">
            <Target className="size-6 text-focus" />
          </div>
        }
        value={minutes ? formatDuration(minutes) : '–'}
        detail={minutes ? de.focus.sessions(trackerDay.count) : de.focus.none}
      />
      <FocusActions trackerDay={trackerDay} date={date} />
      <FocusSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

export const focusFrontend: FrontendModule = {
  id: 'focus',
  widgets: { 'focus.today': FocusWidget },
  QuickActions: FocusActions,
};
