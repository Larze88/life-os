import type { FrontendModule } from '../types';
import { SleepDetailSheet } from './SleepDetailSheet';
import { SleepQuickActions, SleepWidget } from './SleepWidget';
import { formatDuration } from '@/lib/format';

export const sleepFrontend: FrontendModule = {
  id: 'sleep',
  formatValue: (v) => formatDuration(v),
  widgets: { 'sleep.last_night': SleepWidget },
  QuickActions: SleepQuickActions,
  DetailSheet: SleepDetailSheet,
};
