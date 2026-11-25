import type { ComponentType } from 'react';
import type { DaySummary, Tracker, TrackerDay, Widget } from '@lifeos/shared';

export interface WidgetProps {
  widget: Widget;
  /** The tracker the widget belongs to, with the aggregated values of `date`. */
  trackerDay: TrackerDay | undefined;
  date: string;
  /** The whole day, for widgets that span several trackers (e.g. all habits). */
  day: DaySummary;
}

export interface TrackerUiProps {
  trackerDay: TrackerDay;
  date: string;
}

/**
 * Frontend side of the module system (docs/ARCHITECTURE.md §4). Validation and fields
 * live in @lifeos/shared; this adds the UI.
 */
export interface FrontendModule {
  /** Must match the id in @lifeos/shared's module registry. */
  id: string;
  /** Widget components by widget type (e.g. 'water.progress'). */
  widgets: Record<string, ComponentType<WidgetProps>>;
  /** Compact one-tap actions, shown in the quick-add sheet. */
  QuickActions?: ComponentType<TrackerUiProps>;
  /** Formats a (daily aggregated) primary value for statistics, e.g. "7 h 45 min". */
  formatValue?: (value: number, tracker: Tracker) => string;
  /** Full view for a tracker on a day: entries, editing, settings. */
  DetailSheet?: ComponentType<
    TrackerUiProps & { open: boolean; onOpenChange: (open: boolean) => void }
  >;
}
