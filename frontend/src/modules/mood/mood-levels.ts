import { MOOD_LEVELS } from '@lifeos/shared';
import type { ScaleOption } from '@/components/ScalePicker';

export const moodOptions: ScaleOption[] = MOOD_LEVELS.map((l) => ({
  value: l.value,
  symbol: l.emoji,
  label: l.label,
}));

export function moodLevel(value: number) {
  return MOOD_LEVELS[Math.min(4, Math.max(0, Math.round(value) - 1))]!;
}
