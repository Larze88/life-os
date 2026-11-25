import { useState, type FormEvent } from 'react';
import { Plus, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { symptomConfigSchema, type TrackerDay } from '@lifeos/shared';
import { ChipGroup } from '@/components/ChipGroup';
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
  useUpdateTracker,
} from '@/features/tracking/tracking-api';
import { entryMomentFor } from '@/lib/entry-time';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';
import { formatDecimal } from '@/lib/format';

const ACCENT = 'bg-symptom text-white';

function catalogOf(trackerDay: TrackerDay): string[] {
  const parsed = symptomConfigSchema.safeParse(trackerDay.tracker.config);
  return parsed.success ? parsed.data.catalog : [];
}

function SymptomForm({
  trackerDay,
  date,
  onSaved,
}: {
  trackerDay: TrackerDay;
  date: string;
  onSaved: () => void;
}) {
  const catalog = catalogOf(trackerDay);
  const [symptom, setSymptom] = useState<string>();
  const [other, setOther] = useState('');
  const [intensity, setIntensity] = useState<number>();
  const [note, setNote] = useState('');
  const add = useAddEntry();
  const updateTracker = useUpdateTracker();
  const dayStart = useDayStart();
  const name = other.trim() || symptom;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name || intensity === undefined) return;
    // New symptoms are added to the catalog for next time.
    if (!catalog.includes(name)) {
      updateTracker.mutate({
        id: trackerDay.tracker.id,
        update: { config: { catalog: [...catalog, name].slice(-50) } },
      });
    }
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: trackerDay.tracker.id,
          ...entryMomentFor(date, dayStart),
          value: intensity,
          data: { symptom: name },
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(de.symptoms.saved(name));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{de.symptoms.which}</Label>
        <ChipGroup
          label={de.symptoms.which}
          options={catalog.map((c) => ({ value: c, label: c }))}
          value={other.trim() ? undefined : symptom}
          onChange={(v) => {
            setSymptom(v);
            setOther('');
          }}
          accentClass={ACCENT}
        />
        <Input
          aria-label={de.symptoms.other}
          placeholder={de.symptoms.otherPlaceholder}
          maxLength={60}
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.symptoms.intensity}</Label>
        <div
          role="radiogroup"
          aria-label={de.symptoms.intensity}
          className="grid grid-cols-5 gap-2"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={intensity === n}
              aria-label={String(n)}
              onClick={() => setIntensity(n)}
              className={cn(
                'h-11 rounded-xl bg-secondary font-semibold',
                intensity === n && ACCENT,
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="symptom-note">{de.symptoms.note}</Label>
        <Input
          id="symptom-note"
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" disabled={!name || intensity === undefined || add.isPending}>
        {de.symptoms.save}
      </Button>
    </form>
  );
}

function SymptomSheet({
  trackerDay,
  date,
  open,
  onOpenChange,
}: TrackerUiProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  const entries = useEntries(open ? trackerDay.tracker.id : '', date);
  return (
    <ModuleSheet
      title={trackerDay.tracker.name}
      date={date}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SymptomForm trackerDay={trackerDay} date={date} onSaved={() => onOpenChange(false)} />
      <EntryList
        title={de.symptoms.entries}
        entries={entries.data}
        date={date}
        render={(e) => (
          <>
            <p className="font-medium">
              {String(e.data.symptom)} · {e.value}/10
            </p>
            {e.note && <p className="text-sm text-muted-foreground">{e.note}</p>}
          </>
        )}
      />
    </ModuleSheet>
  );
}

function SymptomWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const entries = useEntries(trackerDay?.tracker.id ?? '', date);
  if (!trackerDay) return null;
  const names = [...new Set(entries.data?.map((e) => String(e.data.symptom)) ?? [])];
  return (
    <Card className="gap-4">
      <WidgetHeader
        onClick={() => setOpen(true)}
        label={de.symptoms.openDetails}
        title={trackerDay.tracker.name}
        visual={
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-symptom/12">
            <Stethoscope className="size-6 text-symptom" />
          </div>
        }
        value={trackerDay.count ? de.symptoms.count(trackerDay.count) : de.symptoms.none}
        detail={
          trackerDay.count && trackerDay.value
            ? `${names.join(', ')} · ${de.symptoms.strongest(trackerDay.value)}`
            : null
        }
      />
      <SymptomQuickActions trackerDay={trackerDay} date={date} />
      <SymptomSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function SymptomQuickActions({ trackerDay, date }: TrackerUiProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className="h-12 w-full bg-symptom/10 text-base font-semibold text-symptom hover:bg-symptom/20"
        onClick={() => setOpen(true)}
      >
        <Plus /> {de.symptoms.add}
      </Button>
      <SymptomSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}

export const symptomFrontend: FrontendModule = {
  id: 'symptom',
  formatValue: (v) => `${formatDecimal(v)}/10`,
  widgets: { 'symptoms.today': SymptomWidget },
  QuickActions: SymptomQuickActions,
};
