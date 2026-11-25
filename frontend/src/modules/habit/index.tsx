import { useDayEntries } from '@/features/tracking/tracking-api';
import type { FrontendModule, TrackerUiProps } from '../types';
import { HabitsWidget } from './HabitsWidget';
import { HabitToggle } from './HabitToggle';
import { formatDecimal } from '@/lib/format';

function HabitQuickActions({ trackerDay, date }: TrackerUiProps) {
  const entries = useDayEntries(date);
  return <HabitToggle trackerDay={trackerDay} date={date} entries={entries.data} />;
}

export const habitFrontend: FrontendModule = {
  id: 'habit',
  formatValue: (v) => `${formatDecimal(v)}×`,
  widgets: { 'habits.today': HabitsWidget },
  QuickActions: HabitQuickActions,
};
