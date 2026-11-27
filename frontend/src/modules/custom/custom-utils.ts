import {
  customConfigSchema,
  type CustomConfig,
  type FieldDefinition,
  type Tracker,
} from '@lifeos/shared';
import { formatDecimal, formatDuration } from '@/lib/format';
import { de } from '@/lib/i18n/de';

export function customConfig(tracker: Tracker): CustomConfig | null {
  const parsed = customConfigSchema.safeParse(tracker.config);
  return parsed.success ? parsed.data : null;
}

export function primaryFieldOf(config: CustomConfig | null): FieldDefinition | undefined {
  return config?.primaryField
    ? config.fields.find((f) => f.key === config.primaryField)
    : undefined;
}

/** Formats a daily aggregated value according to the primary field. */
export function formatCustomValue(value: number, tracker: Tracker): string {
  const config = customConfig(tracker);
  const primary = primaryFieldOf(config);
  if (!config || !primary || config.aggregate === 'count') return `${formatDecimal(value)}×`;
  switch (primary.type) {
    case 'duration':
      return formatDuration(Math.round(value));
    case 'scale':
      return `${formatDecimal(value)}/${primary.max}`;
    case 'boolean':
      return config.aggregate === 'sum'
        ? `${formatDecimal(value)}×`
        : value >= 1
          ? de.fields.yes
          : de.fields.no;
    case 'number':
      return primary.unit ? `${formatDecimal(value)} ${primary.unit}` : formatDecimal(value);
    default:
      return formatDecimal(value);
  }
}

/** "Tassen: 2 · Art: Espresso" for one entry. */
export function describeEntry(data: Record<string, unknown>, config: CustomConfig | null): string {
  if (!config) return '';
  return config.fields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => {
      const v = data[f.key];
      let text: string;
      if (typeof v === 'boolean') text = v ? de.fields.yes : de.fields.no;
      else if (Array.isArray(v)) text = v.join(', ');
      else if (f.type === 'duration' && typeof v === 'number') text = formatDuration(v);
      else if (typeof v === 'number')
        text = `${formatDecimal(v)}${f.type === 'number' && f.unit ? ` ${f.unit}` : ''}`;
      else text = String(v);
      return `${f.label}: ${text}`;
    })
    .join(' · ');
}

/** A tracker with exactly one visible yes/no field can be recorded with one tap. */
export function oneTapField(config: CustomConfig | null): FieldDefinition | undefined {
  const visible = config?.fields.filter((f) => !f.deprecated) ?? [];
  return visible.length === 1 && visible[0]!.type === 'boolean' ? visible[0] : undefined;
}
