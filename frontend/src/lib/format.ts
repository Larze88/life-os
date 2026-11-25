const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const longDay = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatLongDay(date: Date): string {
  return longDay.format(date);
}

/** Long day name for a logical day "YYYY-MM-DD" (rendered at noon to avoid DST edge cases). */
export function formatLocalDate(localDate: string): string {
  return longDay.format(new Date(`${localDate}T12:00:00`));
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

export function formatNumber(value: number): string {
  return integer.format(value);
}

/** "7 h 45 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Local wall-clock instant for a logical day and a time "HH:mm". */
export function localDateTime(localDate: string, time: string): Date {
  return new Date(`${localDate}T${time}:00`);
}

export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}
