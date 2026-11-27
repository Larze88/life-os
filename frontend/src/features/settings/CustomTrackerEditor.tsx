import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CUSTOM_AGGREGATES,
  PRIMARY_FIELD_TYPES,
  customConfigSchema,
  nextFieldKey,
  type CustomConfig,
  type FieldDefinition,
  type Tracker,
} from '@lifeos/shared';
import { ChipGroup } from '@/components/ChipGroup';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTracker, useUpdateTracker } from '@/features/tracking/tracking-api';
import { ApiError } from '@/lib/api';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';

type FieldType = FieldDefinition['type'];
const NEW_FIELD_TYPES: FieldType[] = [
  'number',
  'scale',
  'boolean',
  'select',
  'multiselect',
  'text',
  'duration',
];
type Aggregate = CustomConfig['aggregate'];

interface DraftField {
  key: string;
  label: string;
  type: FieldType;
  unit: string;
  scaleMax: 5 | 10;
  optionsText: string;
  required: boolean;
  deprecated: boolean;
  isNew: boolean;
  /** Original definition of existing fields (keeps all their properties). */
  original?: FieldDefinition;
}

function toDraft(f: FieldDefinition): DraftField {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    unit: f.type === 'number' ? (f.unit ?? '') : '',
    scaleMax: f.type === 'scale' && f.max === 10 ? 10 : 5,
    optionsText: f.type === 'select' || f.type === 'multiselect' ? f.options.join(', ') : '',
    required: f.required,
    deprecated: f.deprecated,
    isNew: false,
    original: f,
  };
}

function toField(d: DraftField): unknown {
  const base = {
    key: d.key,
    label: d.label.trim(),
    required: d.required,
    deprecated: d.deprecated,
  };
  const options = d.optionsText
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  switch (d.type) {
    case 'number':
      return { ...(d.original ?? {}), ...base, type: 'number', unit: d.unit.trim() || undefined };
    case 'scale':
      return d.original
        ? { ...d.original, ...base }
        : { ...base, type: 'scale', min: 1, max: d.scaleMax };
    case 'select':
    case 'multiselect':
      return { ...(d.original ?? {}), ...base, type: d.type, options };
    case 'text':
      return d.original
        ? { ...d.original, ...base }
        : { ...base, type: 'text', maxLength: 500, multiline: false };
    default:
      return { ...(d.original ?? {}), ...base, type: d.type };
  }
}

function defaultAggregate(type: FieldType | undefined): Aggregate {
  if (!type) return 'count';
  return type === 'scale' ? 'avg' : 'sum';
}

export function CustomTrackerEditor({
  tracker,
  open,
  onOpenChange,
}: {
  tracker?: Tracker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ModuleSheet
      title={tracker ? de.custom.editTitle(tracker.name) : de.custom.createTitle}
      open={open}
      onOpenChange={onOpenChange}
    >
      <EditorForm tracker={tracker} onDone={() => onOpenChange(false)} />
    </ModuleSheet>
  );
}

function EditorForm({ tracker, onDone }: { tracker?: Tracker; onDone: () => void }) {
  const existing = tracker ? customConfigSchema.safeParse(tracker.config) : undefined;
  const initial = existing?.success ? existing.data : undefined;
  const editing = Boolean(tracker);

  const [name, setName] = useState(tracker?.name ?? '');
  const [icon, setIcon] = useState(tracker?.icon ?? '');
  const [fields, setFields] = useState<DraftField[]>(
    initial
      ? initial.fields.map(toDraft)
      : [
          {
            key: 'f1',
            label: '',
            type: 'number',
            unit: '',
            scaleMax: 5,
            optionsText: '',
            required: true,
            deprecated: false,
            isNew: true,
          },
        ],
  );
  const [primaryField, setPrimaryField] = useState<string | undefined>(
    initial ? initial.primaryField : 'f1',
  );
  const [aggregate, setAggregate] = useState<Aggregate>(initial?.aggregate ?? 'sum');
  const create = useCreateTracker();
  const update = useUpdateTracker();

  const updateField = (key: string, patch: Partial<DraftField>) =>
    setFields((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const eligible = fields.filter(
    (f) => (PRIMARY_FIELD_TYPES as readonly string[]).includes(f.type) && !f.deprecated,
  );
  const effectivePrimary =
    primaryField && fields.some((f) => f.key === primaryField) ? primaryField : undefined;
  const config = {
    fields: fields.map(toField),
    primaryField: effectivePrimary,
    aggregate: effectivePrimary ? aggregate : 'count',
  };
  const parsed = customConfigSchema.safeParse(config);
  const nameValid = name.trim().length > 0;
  const error = !parsed.success ? (parsed.error.issues[0]?.message ?? de.custom.invalid) : null;

  function onSave() {
    if (!parsed.success || !nameValid) return;
    const onError = (err: unknown) =>
      toast.error(
        err instanceof ApiError ? (err.problem.detail ?? de.common.notSaved) : de.common.notSaved,
      );
    if (tracker) {
      update.mutate(
        {
          id: tracker.id,
          update: { name: name.trim(), icon: icon.trim() || null, config: parsed.data },
        },
        { onSuccess: () => (toast.success(de.custom.saved), onDone()), onError },
      );
    } else {
      create.mutate(
        { module: 'custom', name: name.trim(), icon: icon.trim() || null, config: parsed.data },
        { onSuccess: () => (toast.success(de.custom.created(name.trim())), onDone()), onError },
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="custom-name">{de.custom.name}</Label>
          <Input
            id="custom-name"
            maxLength={60}
            placeholder={de.custom.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="custom-icon" className="truncate">
            {de.custom.icon}
          </Label>
          <Input
            id="custom-icon"
            maxLength={8}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="text-center text-xl"
          />
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-label={de.custom.fieldsTitle}>
        <h3 className="text-sm font-semibold text-muted-foreground">{de.custom.fieldsTitle}</h3>
        {editing && <p className="text-xs text-muted-foreground">{de.custom.lockedType}</p>}
        {fields.map((f, index) => (
          <div
            key={f.key}
            className={cn(
              'flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-border/60',
              f.deprecated && 'opacity-60',
            )}
          >
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Label htmlFor={`field-${f.key}`}>
                  {de.custom.fieldLabel} {index + 1}
                </Label>
                <Input
                  id={`field-${f.key}`}
                  maxLength={60}
                  placeholder={de.custom.fieldLabelPlaceholder}
                  value={f.label}
                  onChange={(e) => updateField(f.key, { label: e.target.value })}
                />
              </div>
              {f.isNew && fields.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={de.custom.removeField}
                  onClick={() => {
                    setFields((list) => list.filter((x) => x.key !== f.key));
                    if (primaryField === f.key) setPrimaryField(undefined);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            {f.isNew ? (
              <ChipGroup
                label={`${de.custom.fieldType} ${index + 1}`}
                options={NEW_FIELD_TYPES.map((t) => ({ value: t, label: de.fields.types[t]! }))}
                value={f.type}
                onChange={(t) => {
                  updateField(f.key, { type: t });
                  if (primaryField === f.key) setAggregate(defaultAggregate(t));
                }}
                accentClass="bg-custom text-white"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {de.custom.fieldType}: {de.fields.types[f.type]}
                {f.type === 'scale' ? ` 1–${f.scaleMax}` : ''}
              </p>
            )}
            {f.type === 'number' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground" aria-hidden>
                  {de.custom.unit}
                </span>
                <Input
                  aria-label={`${de.custom.unit} ${index + 1}`}
                  placeholder={de.custom.unitPlaceholder}
                  maxLength={20}
                  value={f.unit}
                  onChange={(e) => updateField(f.key, { unit: e.target.value })}
                />
              </div>
            )}
            {f.type === 'scale' && f.isNew && (
              <ChipGroup
                label={`${de.custom.scaleRange} ${index + 1}`}
                options={[
                  { value: 5, label: '1–5' },
                  { value: 10, label: '1–10' },
                ]}
                value={f.scaleMax}
                onChange={(v) => updateField(f.key, { scaleMax: v as 5 | 10 })}
                accentClass="bg-custom text-white"
              />
            )}
            {(f.type === 'select' || f.type === 'multiselect') && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground" aria-hidden>
                  {de.custom.options}
                </span>
                <Input
                  aria-label={`${de.custom.options} ${index + 1}`}
                  placeholder={de.custom.optionsPlaceholder}
                  value={f.optionsText}
                  onChange={(e) => updateField(f.key, { optionsText: e.target.value })}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={f.required}
                  onChange={(e) => updateField(f.key, { required: e.target.checked })}
                />
                {de.custom.required}
              </label>
              {!f.isNew && (
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={f.deprecated}
                    onChange={(e) => updateField(f.key, { deprecated: e.target.checked })}
                  />
                  {de.custom.hidden}
                </label>
              )}
            </div>
          </div>
        ))}
        {fields.length < 12 && (
          <Button
            variant="outline"
            onClick={() =>
              setFields((list) => [
                ...list,
                {
                  key: nextFieldKey(list),
                  label: '',
                  type: 'number',
                  unit: '',
                  scaleMax: 5,
                  optionsText: '',
                  required: false,
                  deprecated: false,
                  isNew: true,
                },
              ])
            }
          >
            <Plus /> {de.custom.addField}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label>{de.custom.primary}</Label>
        {editing ? (
          <p className="text-sm text-muted-foreground">
            {fields.find((f) => f.key === effectivePrimary)?.label ?? de.custom.primaryNone} ·{' '}
            {de.custom.primaryLocked}
          </p>
        ) : (
          <ChipGroup
            label={de.custom.primary}
            options={[
              { value: '', label: de.custom.primaryNone },
              ...eligible.map((f) => ({
                value: f.key,
                label: f.label.trim() || `${de.custom.fieldLabel} ${fields.indexOf(f) + 1}`,
              })),
            ]}
            value={effectivePrimary ?? ''}
            onChange={(key) => {
              setPrimaryField(key || undefined);
              setAggregate(defaultAggregate(fields.find((f) => f.key === key)?.type));
            }}
            accentClass="bg-custom text-white"
          />
        )}
      </section>

      {effectivePrimary && (
        <section className="flex flex-col gap-2">
          <Label>{de.custom.aggregate}</Label>
          <ChipGroup
            label={de.custom.aggregate}
            options={CUSTOM_AGGREGATES.map((a) => ({ value: a, label: de.custom.aggregates[a]! }))}
            value={aggregate}
            onChange={setAggregate}
            accentClass="bg-custom text-white"
          />
        </section>
      )}

      {nameValid && error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="lg"
        onClick={onSave}
        disabled={!nameValid || !parsed.success || create.isPending || update.isPending}
      >
        {de.custom.save}
      </Button>
    </div>
  );
}
