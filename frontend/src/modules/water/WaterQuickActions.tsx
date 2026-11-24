import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { formatNumber } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import type { TrackerUiProps } from '../types';
import { waterConfig } from './water-config';

export function WaterQuickActions({
  trackerDay,
  date,
  className,
}: TrackerUiProps & { className?: string }) {
  const quickAdd = useQuickAdd();
  const { quickAmounts } = waterConfig(trackerDay);
  return (
    <div
      className={cn(
        'grid gap-2',
        quickAmounts.length > 2 ? 'grid-cols-2' : 'grid-cols-2',
        className,
      )}
    >
      {quickAmounts.map((ml) => (
        <Button
          key={ml}
          variant="secondary"
          className="h-12 bg-water/12 text-base font-semibold text-water hover:bg-water/20"
          aria-label={de.water.addAmount(formatNumber(ml))}
          onClick={(e) => {
            e.stopPropagation();
            quickAdd.add({
              date,
              trackerId: trackerDay.tracker.id,
              value: ml,
              message: de.water.added(formatNumber(ml)),
            });
          }}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {formatNumber(ml)} ml
        </Button>
      ))}
    </div>
  );
}
