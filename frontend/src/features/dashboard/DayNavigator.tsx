import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { formatLocalDate } from '@/lib/format';
import { de } from '@/lib/i18n/de';

export function DayNavigator({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const isToday = date === today;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={de.today.previousDay}
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-muted-foreground md:flex-none">
        {formatLocalDate(date)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={de.today.nextDay}
        disabled={isToday}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
      {!isToday && (
        <Button variant="secondary" size="sm" onClick={() => onChange(today)}>
          {de.today.backToToday}
        </Button>
      )}
    </div>
  );
}
