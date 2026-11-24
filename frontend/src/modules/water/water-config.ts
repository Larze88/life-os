import { waterConfigSchema, type TrackerDay, type WaterConfig } from '@lifeos/shared';

export function waterConfig(trackerDay: TrackerDay): WaterConfig {
  const parsed = waterConfigSchema.safeParse(trackerDay.tracker.config);
  return parsed.success ? parsed.data : waterConfigSchema.parse({});
}
