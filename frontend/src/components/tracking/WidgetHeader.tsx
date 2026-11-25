import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** Tappable top area of a widget card (opens the detail sheet). */
export function WidgetHeader({
  onClick,
  label,
  visual,
  title,
  value,
  detail,
}: {
  onClick: () => void;
  label: string;
  visual: ReactNode;
  title: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="-m-2 flex items-center gap-4 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {visual}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="truncate text-2xl font-bold tabular-nums tracking-tight">{value}</div>
        {detail && <p className="truncate text-sm text-muted-foreground">{detail}</p>}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
