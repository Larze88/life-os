import { ScalePicker } from '@/components/ScalePicker';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { de } from '@/lib/i18n/de';
import type { TrackerUiProps } from '../types';
import { moodLevel, moodOptions } from './mood-levels';

/** One tap = one mood rating. */
export function MoodQuickActions({ trackerDay, date }: TrackerUiProps) {
  const quickAdd = useQuickAdd();
  return (
    <ScalePicker
      label={de.mood.question}
      options={moodOptions}
      value={undefined}
      size="lg"
      onChange={(value) =>
        quickAdd.add({
          date,
          trackerId: trackerDay.tracker.id,
          value,
          message: de.mood.added(moodLevel(value).label),
        })
      }
    />
  );
}
