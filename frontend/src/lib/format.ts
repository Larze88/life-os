const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const longDay = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatLongDay(date: Date): string {
  return longDay.format(date);
}
