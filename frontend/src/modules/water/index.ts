import type { FrontendModule } from '../types';
import { WaterDetailSheet } from './WaterDetailSheet';
import { WaterQuickActions } from './WaterQuickActions';
import { WaterWidget } from './WaterWidget';

export const waterFrontend: FrontendModule = {
  id: 'water',
  widgets: { 'water.progress': WaterWidget },
  QuickActions: WaterQuickActions,
  DetailSheet: WaterDetailSheet,
};
