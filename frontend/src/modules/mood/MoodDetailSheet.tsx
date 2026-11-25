import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScalePicker, numericScale } from '@/components/ScalePicker';
import { Button } from '@/components/ui/button';
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
  useDayStart,
  useDeleteEntry,
  useEntries,
  useToday,
} from '@/features/tracking/tracking-api';
import { entryMomentFor } from '@/lib/entry-time';
import { formatLocalDate, formatTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import type { TrackerUiProps } from '../types';
import { moodLevel, moodOptions } from './mood-levels';

type Props = TrackerUiProps & { open: boolean; onOpenChange: (open: boolean) => void };

const energyScale = numericScale(de.mood.low, de.mood.high);

export function MoodDetailSheet({ trackerDay, date, open, onOpenChange }: Props) {
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
            <MoodForm
              trackerId={trackerDay.tracker.id}
              date={date}
              onSaved={() => onOpenChange(false)}
            />
            <MoodEntries trackerId={trackerDay.tracker.id} date={date} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MoodForm({
  trackerId,
  date,
  onSaved,
}: {
  trackerId: string;
  date: string;
  onSaved: () => void;
}) {
  const [mood, setMood] = useState<number>();
  const [energy, setEnergy] = useState<number>();
  const [stress, setStress] = useState<number>();
  const [wellbeing, setWellbeing] = useState<number>();
  const [note, setNote] = useState('');
  const add = useAddEntry();
  const dayStart = useDayStart();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (mood === undefined) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId,
          ...entryMomentFor(date, dayStart),
          value: mood,
          data: { energy, stress, wellbeing },
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(de.mood.added(moodLevel(mood).label));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{de.mood.question}</Label>
        <ScalePicker
          label={de.mood.question}
          options={moodOptions}
          value={mood}
          onChange={setMood}
          size="lg"
          accentClass="bg-mood/30 ring-2 ring-mood"
        />
      </div>
      <ScaleField label={de.mood.energy} value={energy} onChange={setEnergy} />
      <ScaleField label={de.mood.stress} value={stress} onChange={setStress} />
      <ScaleField label={de.mood.wellbeing} value={wellbeing} onChange={setWellbeing} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="mood-note">{de.mood.note}</Label>
        <textarea
          id="mood-note"
          rows={3}
          maxLength={2000}
          value={note}
          placeholder={de.mood.notePlaceholder}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      <Button type="submit" size="lg" disabled={mood === undefined || add.isPending}>
        {de.mood.save}
      </Button>
    </form>
  );
}

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {/* Tapping the selected value again clears it (all details are optional). */}
      <ScalePicker
        label={label}
        options={energyScale}
        value={value}
        onChange={(v) => onChange(v === value ? undefined : v)}
      />
    </div>
  );
}

function MoodEntries({ trackerId, date }: { trackerId: string; date: string }) {
  const entries = useEntries(trackerId, date);
  const remove = useDeleteEntry();
  if (!entries.data) return null;
  return (
    <section className="flex flex-col gap-2 border-t pt-4" aria-label={de.mood.entries}>
      <h3 className="text-sm font-semibold text-muted-foreground">{de.mood.entries}</h3>
      {entries.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{de.mood.noEntries}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
          {[...entries.data].reverse().map((entry) => {
            const level = moodLevel(entry.value ?? 3);
            const details = [
              entry.data.energy ? `${de.mood.energy} ${String(entry.data.energy)}` : null,
              entry.data.stress ? `${de.mood.stress} ${String(entry.data.stress)}` : null,
              entry.data.wellbeing ? `${de.mood.wellbeing} ${String(entry.data.wellbeing)}` : null,
            ].filter(Boolean);
            return (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-12 text-sm tabular-nums text-muted-foreground">
                  {formatTime(entry.occurredAt)}
                </span>
                <span className="text-2xl" aria-hidden>
                  {level.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{level.label}</p>
                  {details.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">{details.join(' · ')}</p>
                  )}
                  {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={de.common.delete}
                  onClick={() =>
                    remove.mutate({ id: entry.id, date, trackerId, value: entry.value })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
