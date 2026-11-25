import { cn } from '@/lib/utils';

interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

/** Wrapping row of selectable chips (single choice). */
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  accentClass = 'bg-primary text-primary-foreground',
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  accentClass?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-11 rounded-full bg-secondary px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            o.value === value && accentClass,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Wrapping row of toggle chips (multiple choice). */
export function MultiChipGroup({
  label,
  options,
  values,
  onChange,
  accentClass = 'bg-primary text-primary-foreground',
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  accentClass?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? values.filter((v) => v !== o) : [...values, o])}
            className={cn(
              'h-10 rounded-full bg-secondary px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              on && accentClass,
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
