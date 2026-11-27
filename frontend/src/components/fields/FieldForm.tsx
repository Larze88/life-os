import type { FieldDefinition } from '@lifeos/shared';
import { ChipGroup, MultiChipGroup } from '@/components/ChipGroup';
import { DurationPicker } from '@/components/tracking/DurationPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';

export type FieldValues = Record<string, unknown>;

/**
 * Generic form built from field definitions (docs/ARCHITECTURE.md §6). Validation is done
 * by the caller with `buildDataSchema(fields)` from @lifeos/shared — no duplicate rules here.
 * Deprecated fields are not shown.
 */
export function FieldForm({
  fields,
  values,
  onChange,
  idPrefix,
  accentClass = 'bg-custom text-white',
}: {
  fields: readonly FieldDefinition[];
  values: FieldValues;
  onChange: (values: FieldValues) => void;
  idPrefix: string;
  accentClass?: string;
}) {
  const set = (key: string, value: unknown) => {
    const next = { ...values };
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
      delete next[key];
    else next[key] = value;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {fields
        .filter((f) => !f.deprecated)
        .map((field) => {
          const id = `${idPrefix}-${field.key}`;
          const label = `${field.label}${field.required ? '' : ` ${de.fields.optional}`}`;
          return (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={id}>{label}</Label>
              <FieldInput
                field={field}
                id={id}
                label={label}
                value={values[field.key]}
                onChange={(v) => set(field.key, v)}
                accentClass={accentClass}
              />
              {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
            </div>
          );
        })}
    </div>
  );
}

function FieldInput({
  field,
  id,
  label,
  value,
  onChange,
  accentClass,
}: {
  field: FieldDefinition;
  id: string;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  accentClass: string;
}) {
  switch (field.type) {
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <NumberInput id={id} value={value} onChange={onChange} />
          {field.unit && (
            <span className="shrink-0 text-sm text-muted-foreground">{field.unit}</span>
          )}
        </div>
      );
    case 'scale': {
      const options = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
      return (
        <div
          role="radiogroup"
          aria-label={label}
          className={cn('grid gap-2', options.length > 5 ? 'grid-cols-5' : '')}
          style={
            options.length <= 5
              ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {options.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={String(n)}
              onClick={() => onChange(value === n && !field.required ? undefined : n)}
              className={cn(
                'h-11 rounded-xl bg-secondary font-semibold',
                value === n && accentClass,
              )}
            >
              {field.labels?.[String(n)] ?? n}
            </button>
          ))}
        </div>
      );
    }
    case 'boolean':
      return (
        <ChipGroup
          label={label}
          options={[
            { value: 'yes', label: de.fields.yes },
            { value: 'no', label: de.fields.no },
          ]}
          value={value === true ? 'yes' : value === false ? 'no' : undefined}
          onChange={(v) => onChange(v === 'yes')}
          accentClass={accentClass}
        />
      );
    case 'select':
      return (
        <ChipGroup
          label={label}
          options={field.options.map((o) => ({ value: o, label: o }))}
          value={typeof value === 'string' ? value : undefined}
          onChange={(v) => onChange(v === value && !field.required ? undefined : v)}
          accentClass={accentClass}
        />
      );
    case 'multiselect':
      return (
        <MultiChipGroup
          label={label}
          options={field.options}
          values={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          accentClass={accentClass}
        />
      );
    case 'text':
      return field.multiline ? (
        <textarea
          id={id}
          rows={3}
          maxLength={field.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : (
        <Input
          id={id}
          maxLength={field.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'time':
      return (
        <Input
          id={id}
          type="time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'duration':
      return (
        <DurationPicker
          label={label}
          presets={[15, 30, 60]}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
          accentClass={accentClass}
        />
      );
  }
}

/** Decimal input that accepts "2,5" and keeps the raw text while typing. */
function NumberInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <Input
      id={id}
      inputMode="decimal"
      defaultValue={typeof value === 'number' ? String(value).replace('.', ',') : ''}
      onChange={(e) => {
        const text = e.target.value.trim().replace(',', '.');
        const n = Number(text);
        onChange(text === '' ? undefined : Number.isFinite(n) ? n : text);
      }}
    />
  );
}
