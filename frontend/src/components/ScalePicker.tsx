import { cn } from '@/lib/utils';

export interface ScaleOption {
  value: number;
  /** Big symbol shown in the button (emoji or number). */
  symbol: string;
  label: string;
}

/** Row of large tap targets for 1–5 ratings (mood, energy, quality, …). */
export function ScalePicker({
  options,
  value,
  onChange,
  label,
  size = 'md',
  accentClass = 'bg-primary text-primary-foreground',
}: {
  options: readonly ScaleOption[];
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  size?: 'md' | 'lg';
  accentClass?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center rounded-xl bg-secondary font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95',
              size === 'lg' ? 'h-14 text-2xl' : 'h-11 text-base',
              selected && accentClass,
            )}
          >
            {option.symbol}
          </button>
        );
      })}
    </div>
  );
}

/** Plain 1–5 scale with low/high labels as accessible names. */
export function numericScale(lowLabel: string, highLabel: string): ScaleOption[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    value: n,
    symbol: String(n),
    label: n === 1 ? `1 – ${lowLabel}` : n === 5 ? `5 – ${highLabel}` : String(n),
  }));
}
