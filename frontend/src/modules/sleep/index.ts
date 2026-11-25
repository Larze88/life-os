import type { FrontendModule } from '../types';
import { SleepDetailSheet } from './SleepDetailSheet';
import { SleepQuickActions, SleepWidget } from './SleepWidget';

export const sleepFrontend: FrontendModule = {
  id: 'sleep',
  widgets: { 'sleep.last_night': SleepWidget },
  QuickActions: SleepQuickActions,
  DetailSheet: SleepDetailSheet,
};
