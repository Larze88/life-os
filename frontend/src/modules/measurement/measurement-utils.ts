import {
  addDays,
  measurementConfigSchema,
  type MeasurementConfig,
  type Tracker,
} from '@lifeos/shared';

export function measurementConfig(tracker: Tracker): MeasurementConfig {
  const parsed = measurementConfigSchema.safeParse(tracker.config);
  return parsed.success ? parsed.data : { unit: '', decimals: 0 };
}

export function formatMeasurement(value: number, decimals: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Parses German or English decimal input ("78,4" / "78.4"). */
export function parseMeasurement(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** History window used for "latest value" and the recent list. */
export function historyRange(date: string): { from: string; to: string } {
  return { from: addDays(date, -365), to: date };
}
