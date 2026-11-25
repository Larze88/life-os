import { useState, type FormEvent } from 'react';
import { Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { MEAL_TYPES, mealConfigSchema, type TrackerDay } from '@lifeos/shared';
import { ChipGroup, MultiChipGroup } from '@/components/ChipGroup';
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
import { cn } from '@/lib/utils';
import type { FrontendModule, TrackerUiProps, WidgetProps } from '../types';

const ACCENT = 'bg-meal text-white';
type MealType = (typeof MEAL_TYPES)[number]['value'];
const labelOf = (type: unknown) => MEAL_TYPES.find((m) => m.value === type)?.label ?? String(type);

/** One tap per meal type; a check mark shows what was already recorded today. */
function MealQuickActions({ trackerDay, date }: TrackerUiProps) {
  const quickAdd = useQuickAdd();
  const entries = useEntries(trackerDay.tracker.id, date);
  const counts = new Map<string, number>();
  for (const e of entries.data ?? [])
    counts.set(String(e.data.mealType), (counts.get(String(e.data.mealType)) ?? 0) + 1);

  return (
    <div className="grid grid-cols-2 gap-2">
      {MEAL_TYPES.map((m) => {
        const n = counts.get(m.value) ?? 0;
        return (
          <button
            key={m.value}
            type="button"
            aria-label={de.meals.add(m.label)}
            onClick={() =>
              quickAdd.add({
                date,
                trackerId: trackerDay.tracker.id,
                value: null,
                data: { mealType: m.value },
                message: de.meals.added(m.label),
              })
            }
            className={cn(
              'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]',
              n > 0 ? 'bg-meal/25 text-foreground' : 'bg-meal/10 text-meal',
            )}
          >
            {n > 0 && <span aria-hidden>✓</span>}
            {m.label}
            {n > 1 && <span className="text-xs text-muted-foreground">×{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

function MealForm({
  trackerDay,
  date,
  onSaved,
}: {
  trackerDay: TrackerDay;
  date: string;
  onSaved: () => void;
}) {
  const config = mealConfigSchema.safeParse(trackerDay.tracker.config);
  const tagOptions = config.success ? config.data.tags : [];
  const [mealType, setMealType] = useState<MealType>();
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const add = useAddEntry();
  const dayStart = useDayStart();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!mealType) return;
    add.mutate(
      {
        id: newEntryId(),
        date,
        entry: {
          trackerId: trackerDay.tracker.id,
          ...entryMomentFor(date, dayStart),
          value: null,
          data: {
            mealType,
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(tags.length ? { tags } : {}),
          },
        },
      },
      {
        onSuccess: () => {
          toast.success(de.meals.added(labelOf(mealType)));
          onSaved();
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{de.meals.type}</Label>
        <ChipGroup
          label={de.meals.type}
          options={MEAL_TYPES}
          value={mealType}
          onChange={setMealType}
          accentClass={ACCENT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="meal-description">{de.meals.description}</Label>
        <Input
          id="meal-description"
          maxLength={200}
          placeholder={de.meals.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {tagOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>{de.meals.tags}</Label>
          <MultiChipGroup
            label={de.meals.tags}
            options={tagOptions}
            values={tags}
            onChange={setTags}
            accentClass={ACCENT}
          />
        </div>
      )}
      <Button type="submit" size="lg" disabled={!mealType || add.isPending}>
        {de.meals.save}
      </Button>
    </form>
  );
}

function MealWidget({ trackerDay, date }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const entries = useEntries(open && trackerDay ? trackerDay.tracker.id : '', date);
  if (!trackerDay) return null;
  return (
    <Card className="gap-4">
      <WidgetHeader
        onClick={() => setOpen(true)}
        label={de.meals.openDetails}
        title={trackerDay.tracker.name}
        visual={
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-meal/15">
            <Utensils className="size-6 text-meal" />
          </div>
        }
        value={trackerDay.count ? de.meals.count(trackerDay.count) : '–'}
        detail={trackerDay.count ? null : de.meals.none}
      />
      <MealQuickActions trackerDay={trackerDay} date={date} />
      <ModuleSheet title={trackerDay.tracker.name} date={date} open={open} onOpenChange={setOpen}>
        <MealForm trackerDay={trackerDay} date={date} onSaved={() => setOpen(false)} />
        <EntryList
          title={de.meals.entries}
          entries={entries.data}
          date={date}
          render={(e) => (
            <>
              <p className="font-medium">
                {labelOf(e.data.mealType)}
                {e.data.description ? ` · ${String(e.data.description)}` : ''}
              </p>
              {Array.isArray(e.data.tags) && e.data.tags.length > 0 && (
                <p className="text-xs text-muted-foreground">{e.data.tags.join(', ')}</p>
              )}
            </>
          )}
        />
      </ModuleSheet>
    </Card>
  );
}

export const mealFrontend: FrontendModule = {
  id: 'meal',
  widgets: { 'meals.today': MealWidget },
  QuickActions: MealQuickActions,
};
