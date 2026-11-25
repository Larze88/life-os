import type { FrontendModule } from '../types';
import { WaterDetailSheet } from './WaterDetailSheet';
import { WaterQuickActions } from './WaterQuickActions';
import { WaterWidget } from './WaterWidget';
import { formatNumber } from '@/lib/format';

export const waterFrontend: FrontendModule = {
  id: 'water',
  formatValue: (v) => `${formatNumber(Math.round(v))} ml`,
  widgets: { 'water.progress': WaterWidget },
  QuickActions: WaterQuickActions,
  DetailSheet: WaterDetailSheet,
};
