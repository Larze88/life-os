import type { FrontendModule } from '../types';
import { MoodDetailSheet } from './MoodDetailSheet';
import { MoodQuickActions } from './MoodQuickActions';
import { MoodWidget } from './MoodWidget';
import { formatDecimal } from '@/lib/format';
import { moodLevel } from './mood-levels';

export const moodFrontend: FrontendModule = {
  id: 'mood',
  formatValue: (v) => `${formatDecimal(v)} ${moodLevel(v).emoji}`,
  widgets: { 'mood.today': MoodWidget },
  QuickActions: MoodQuickActions,
  DetailSheet: MoodDetailSheet,
};
