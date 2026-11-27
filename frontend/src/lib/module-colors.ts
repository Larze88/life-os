/** Static Tailwind classes per module color token (dynamic class names are not compiled). */
const TEXT: Record<string, string> = {
  water: 'text-water',
  sleep: 'text-sleep',
  mood: 'text-mood',
  habit: 'text-habit',
  activity: 'text-activity',
  meal: 'text-meal',
  measurement: 'text-measurement',
  symptom: 'text-symptom',
  focus: 'text-focus',
  custom: 'text-custom',
};

const CHIP: Record<string, string> = {
  water: 'bg-water text-white',
  sleep: 'bg-sleep text-white',
  mood: 'bg-mood text-black',
  habit: 'bg-habit text-white',
  activity: 'bg-activity text-white',
  meal: 'bg-meal text-white',
  measurement: 'bg-measurement text-white',
  symptom: 'bg-symptom text-white',
  focus: 'bg-focus text-white',
  custom: 'bg-custom text-white',
};

export const moduleTextClass = (color: string | null) => TEXT[color ?? ''] ?? 'text-primary';
export const moduleChipClass = (color: string | null) =>
  CHIP[color ?? ''] ?? 'bg-primary text-primary-foreground';
