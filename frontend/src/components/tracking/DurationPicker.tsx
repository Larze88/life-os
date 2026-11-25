import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Preset durations plus a free minute input. */
export function DurationPicker({
  label,
  presets,
  value,
  onChange,
  accentClass,
}: {
  label: string;
  presets: number[];
  value: number | undefined;
  onChange: (minutes: number | undefined) => void;
  accentClass: string;
}) {
  const [custom, setCustom] = useState(
    value !== undefined && !presets.includes(value) ? String(value) : '',
  );
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {presets.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m && custom === ''}
            onClick={() => {
              setCustom('');
              onChange(m);
            }}
            className={cn(
              'h-11 min-w-16 rounded-full bg-secondary px-4 text-sm font-medium',
              value === m && custom === '' && accentClass,
            )}
          >
            {m} min
          </button>
        ))}
      </div>
      <Input
        aria-label={`${label} (Minuten)`}
        inputMode="numeric"
        placeholder="Andere Dauer in Minuten"
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          const n = Number(e.target.value);
          onChange(e.target.value && Number.isInteger(n) && n > 0 ? n : undefined);
        }}
      />
    </div>
  );
}
