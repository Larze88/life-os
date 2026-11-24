/**
 * Logical-day helpers. A "local date" is a calendar day in the user's wall-clock time,
 * shifted by the configurable day start (e.g. with dayStart "04:00", 01:30 still belongs
 * to the previous day). All evaluations group by local date — see docs/DATA_MODEL.md §3.
 */

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Calendar day in the format YYYY-MM-DD. */
export type LocalDate = string;

/** Wall-clock time in the format HH:mm (24h). */
export type TimeOfDay = string;

export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTimeOfDay(value: string): value is TimeOfDay {
  return TIME_RE.test(value);
}

export function timeOfDayToMinutes(time: TimeOfDay): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new RangeError(`Invalid time of day: ${time}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * UTC offset of the given device-local moment in minutes EAST of UTC
 * (Europe/Berlin: +60 in winter, +120 in summer). Note: the sign is the
 * opposite of Date#getTimezoneOffset().
 */
export function tzOffsetMinutes(date: Date): number {
  const offset = -date.getTimezoneOffset();
  return offset === 0 ? 0 : offset; // avoid -0
}

function formatUtcDate(date: Date): LocalDate {
  return date.toISOString().slice(0, 10);
}

export interface LocalDateInput {
  /** The moment (UTC) the entry refers to. */
  instant: Date | string;
  /** Offset of the recording device in minutes east of UTC. */
  tzOffsetMin: number;
  /** Start of the logical day, default "00:00". */
  dayStart?: TimeOfDay;
}

/** Computes the logical day a moment belongs to. */
export function computeLocalDate({
  instant,
  tzOffsetMin,
  dayStart = '00:00',
}: LocalDateInput): LocalDate {
  const ms = typeof instant === 'string' ? Date.parse(instant) : instant.getTime();
  if (Number.isNaN(ms)) throw new RangeError('Invalid instant');
  if (!Number.isInteger(tzOffsetMin) || Math.abs(tzOffsetMin) > 14 * 60) {
    throw new RangeError(`Invalid tz offset: ${tzOffsetMin}`);
  }
  const shifted = ms + tzOffsetMin * MINUTE_MS - timeOfDayToMinutes(dayStart) * MINUTE_MS;
  return formatUtcDate(new Date(shifted));
}

/** Logical "today" for the device this code runs on. */
export function todayLocalDate(now: Date = new Date(), dayStart: TimeOfDay = '00:00'): LocalDate {
  return computeLocalDate({ instant: now, tzOffsetMin: tzOffsetMinutes(now), dayStart });
}

export function addDays(date: LocalDate, days: number): LocalDate {
  if (!isLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  return formatUtcDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS));
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: LocalDate): number {
  if (!isLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
