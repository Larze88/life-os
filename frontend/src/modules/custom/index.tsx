import { useState, type FormEvent } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { buildDataSchema, type TrackerDay } from '@lifeos/shared';
import { FieldForm, type FieldValues } from '@/components/fields/FieldForm';
import { EntryList } from '@/components/tracking/EntryList';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { WidgetHeader } from '@/components/tracking/WidgetHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newEntryId, useAddEntry, useDayStart, useEntries } from '@/features/tracking/tracking-api';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { entryMomentFor } from '@/lib/entry-time';
import { de } from '@/lib/i18n/de';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';
import { customConfig, describeEntry, formatCustomValue, oneTapField } from './custom-utils';

function CustomEntryForm({
  trackerDay,
  date,
  onSaved,
}: {
  trackerDay: TrackerDay;
  date: string;
  onSaved: () => void;
}) {
  const config = customConfig(trackerDay.tracker);
  const [values, setValues] = useState<FieldValues>({});
  const [note, setNote] = useState('');
  const add = useAddEntry();
  const dayStart = useDayStart();
  if (!config) return null;
  // Same validation as the server (rule 7: one schema source).
  const valid = buildDataSchema(config.fields).safeParse(values).success;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: trackerDay.tracker.id,
          ...entryMomentFor(date, dayStart),
          value: null,
          data: values,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(de.custom.entrySaved(trackerDay.tracker.name));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldForm
        fields={config.fields}
        values={values}
        onChange={setValues}
        idPrefix={`c-${trackerDay.tracker.id}`}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`c-${trackerDay.tracker.id}-note`}>{de.custom.note}</Label>
        <Input
          id={`c-${trackerDay.tracker.id}-note`}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" disabled={!valid || add.isPending}>
        {de.custom.saveEntry}
      </Button>
    </form>
  );
}

function CustomSheet({
  trackerDay,
  date,
  open,
  onOpenChange,
}: TrackerUiProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  const entries = useEntries(open ? trackerDay.tracker.id : '', date);
  const config = customConfig(trackerDay.tracker);
  return (
    <ModuleSheet
      title={trackerDay.tracker.name}
      date={date}
      open={open}
      onOpenChange={onOpenChange}
    >
      <CustomEntryForm trackerDay={trackerDay} date={date} onSaved={() => onOpenChange(false)} />
      <EntryList
        title={de.custom.entries}
        entries={entries.data}
        date={date}
        render={(e) => (
          <>
            <p className="text-sm">{describeEntry(e.data, config) || '✓'}</p>
            {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
          </>
        )}
      />
    </ModuleSheet>
  );
}

function CustomQuickActions({ trackerDay, date }: TrackerUiProps) {
  const [open, setOpen] = useState(false);
  const quickAdd = useQuickAdd();
  const config = customConfig(trackerDay.tracker);
  const field = oneTapField(config);
  return (
    <>
      {field ? (
        <Button
          variant="secondary"
          className="h-12 w-full bg-custom/12 text-base font-semibold text-custom hover:bg-custom/20"
          onClick={() =>
            quickAdd.add({
              date,
              trackerId: trackerDay.tracker.id,
              value: null,
              data: { [field.key]: true },
              message: de.custom.entrySaved(trackerDay.tracker.name),
            })
          }
        >
          {de.custom.addOneTap(field.label)}
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="h-12 w-full bg-custom/12 text-base font-semibold text-custom hover:bg-custom/20"
          onClick={() => setOpen(true)}
        >
          <Plus /> {de.custom.add}
        </Button>
      )}
      <CustomSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}

function CustomWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  if (!trackerDay) return null;
  const { tracker, value, count } = trackerDay;
  return (
    <Card className="gap-4">
      <WidgetHeader
        onClick={() => setOpen(true)}
        label={de.custom.openDetails(tracker.name)}
        title={tracker.name}
        visual={
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-custom/12 text-2xl">
            {tracker.icon ? (
              <span aria-hidden>{tracker.icon}</span>
            ) : (
              <Sparkles className="size-6 text-custom" />
            )}
          </div>
        }
        value={
          count
            ? value !== null
              ? formatCustomValue(value, tracker)
              : de.custom.count(count)
            : '–'
        }
        detail={count ? de.custom.count(count) : de.custom.noEntries}
      />
      <CustomQuickActions trackerDay={trackerDay} date={date} />
      <CustomSheet trackerDay={trackerDay} date={date} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

export const customFrontend: FrontendModule = {
  id: 'custom',
  formatValue: formatCustomValue,
  formatDay: ({ value, count }, tracker) =>
    `${tracker.icon ? `${tracker.icon} ` : ''}${tracker.name} ${value !== null ? formatCustomValue(value, tracker) : de.custom.count(count)}`,
  widgets: { 'custom.tracker': CustomWidget },
  QuickActions: CustomQuickActions,
};
