import { useDayEntries } from '@/features/tracking/tracking-api';
import type { FrontendModule, TrackerUiProps } from '../types';
import { HabitsWidget } from './HabitsWidget';
import { HabitToggle } from './HabitToggle';
import { formatDecimal } from '@/lib/format';
import { de } from '@/lib/i18n/de';

function HabitQuickActions({ trackerDay, date }: TrackerUiProps) {
  const entries = useDayEntries(date);
  return <HabitToggle trackerDay={trackerDay} date={date} entries={entries.data} />;
}

export const habitFrontend: FrontendModule = {
  id: 'habit',
  formatDay: ({ count }, tracker) =>
    count > 1 ? `✓ ${tracker.name} ×${count}` : `✓ ${tracker.name}`,
  formatValue: (v) => `${formatDecimal(v)}×`,
  widgets: { 'habits.today': HabitsWidget },
  widgetTitles: { 'habits.today': de.habits.title },
  QuickActions: HabitQuickActions,
};
