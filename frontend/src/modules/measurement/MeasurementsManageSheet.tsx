import { useState, type FormEvent } from 'react';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { TrackerDay } from '@lifeos/shared';
import { ChipGroup } from '@/components/ChipGroup';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useArchiveTracker, useCreateTracker } from '@/features/tracking/tracking-api';
import { de } from '@/lib/i18n/de';
import { measurementConfig } from './measurement-utils';

export function MeasurementsManageSheet({
  trackers,
  open,
  onOpenChange,
}: {
  trackers: TrackerDay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const archive = useArchiveTracker();
  return (
    <ModuleSheet title={de.measurements.manage} open={open} onOpenChange={onOpenChange}>
      <CreateMeasurementForm />
      {trackers.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
          {trackers.map(({ tracker }) => (
            <li key={tracker.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{tracker.name}</p>
                <p className="text-xs text-muted-foreground">{measurementConfig(tracker).unit}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!window.confirm(de.measurements.archiveConfirm(tracker.name))) return;
                  archive.mutate(tracker.id, { onError: () => toast.error(de.common.notSaved) });
                }}
              >
                <Archive /> {de.habits.archive}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ModuleSheet>
  );
}

function CreateMeasurementForm() {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [decimals, setDecimals] = useState(0);
  const [secondary, setSecondary] = useState('');
  const create = useCreateTracker();
  const valid = name.trim() !== '' && unit.trim() !== '';

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const trimmed = name.trim();
    create.mutate(
      {
        module: 'measurement',
        name: trimmed,
        config: {
          unit: unit.trim(),
          decimals,
          ...(secondary.trim() ? { secondaryLabel: secondary.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(de.measurements.created(trimmed));
          setName('');
          setUnit('');
          setSecondary('');
        },
        onError: () => toast.error(de.common.notSaved),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="measurement-name">{de.measurements.name}</Label>
          <Input
            id="measurement-name"
            maxLength={60}
            placeholder={de.measurements.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="measurement-unit">{de.measurements.unit}</Label>
          <Input
            id="measurement-unit"
            maxLength={15}
            placeholder={de.measurements.unitPlaceholder}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{de.measurements.decimals}</Label>
        <ChipGroup
          label={de.measurements.decimals}
          options={[0, 1, 2].map((d) => ({ value: d, label: String(d) }))}
          value={decimals}
          onChange={setDecimals}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="measurement-secondary">{de.measurements.secondaryLabel}</Label>
        <Input
          id="measurement-secondary"
          maxLength={30}
          placeholder={de.measurements.secondaryPlaceholder}
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!valid || create.isPending}>
        {de.measurements.create}
      </Button>
    </form>
  );
}
