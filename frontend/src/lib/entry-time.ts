import { tzOffsetMinutes, todayLocalDate } from '@lifeos/shared';

/**
 * Moment to record for a new entry on the given logical day: "now" for today,
 * otherwise noon of that day (backdating from the day view).
 */
export function entryMomentFor(
  localDate: string,
  dayStart: string,
  now: Date = new Date(),
): { occurredAt: string; tzOffsetMin: number } {
  const moment =
    localDate === todayLocalDate(now, dayStart) ? now : new Date(`${localDate}T12:00:00`);
  return { occurredAt: moment.toISOString(), tzOffsetMin: tzOffsetMinutes(moment) };
}
