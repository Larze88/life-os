import type { FrontendModule } from '../types';
import { MoodDetailSheet } from './MoodDetailSheet';
import { MoodQuickActions } from './MoodQuickActions';
import { MoodWidget } from './MoodWidget';

export const moodFrontend: FrontendModule = {
  id: 'mood',
  widgets: { 'mood.today': MoodWidget },
  QuickActions: MoodQuickActions,
  DetailSheet: MoodDetailSheet,
};
