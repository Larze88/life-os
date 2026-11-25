import { addDays, sleepDurationMinutes, tzOffsetMinutes } from '@lifeos/shared';
import { localDateTime } from '@/lib/format';

/**
 * Turns "went to bed at HH:mm, woke up at HH:mm" for a wake-up day into instants.
 * A bedtime later than (or equal to) the wake-up time means the evening before.
 */
export function sleepPeriod(wakeDate: string, bedtime: string, wakeTime: string) {
  const end = localDateTime(wakeDate, wakeTime);
  let start = localDateTime(wakeDate, bedtime);
  if (start >= end) start = localDateTime(addDays(wakeDate, -1), bedtime);
  return {
    occurredAt: start.toISOString(),
    endsAt: end.toISOString(),
    tzOffsetMin: tzOffsetMinutes(end),
    minutes: sleepDurationMinutes(start.toISOString(), end.toISOString()),
  };
}

/** "HH:mm" of an ISO instant in local time. */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
