import { habitConfigSchema, type HabitConfig, type TrackerDay } from '@lifeos/shared';
import { de } from '@/lib/i18n/de';

export function habitConfig(trackerDay: TrackerDay): HabitConfig {
  const parsed = habitConfigSchema.safeParse(trackerDay.tracker.config);
  return parsed.success ? parsed.data : habitConfigSchema.parse({});
}

export function scheduleText(config: HabitConfig): string {
  if (config.schedule.type === 'daily') return de.habits.scheduleDaily(config.targetPerDay);
  const days = [...config.schedule.days]
    .sort()
    .map((d) => de.habits.weekdayShort[d - 1])
    .join(', ');
  return de.habits.scheduleDays(days, config.targetPerDay);
}
