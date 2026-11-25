import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/** Mood and well-being. `value` is the mood on a 1–5 scale; details are optional. */

const scale = z.number().int().min(1).max(5);

export const moodConfigSchema = z.object({});
export type MoodConfig = z.infer<typeof moodConfigSchema>;

export const moodDataSchema = z.object({
  energy: scale.optional(),
  stress: scale.optional(),
  wellbeing: scale.optional(),
});
export type MoodData = z.infer<typeof moodDataSchema>;

export const MOOD_LEVELS = [
  { value: 1, emoji: '😞', label: 'Sehr schlecht' },
  { value: 2, emoji: '🙁', label: 'Schlecht' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Gut' },
  { value: 5, emoji: '😄', label: 'Sehr gut' },
] as const;

export const moodModule: ModuleDefinition<MoodConfig, MoodData> = {
  id: 'mood',
  version: 1,
  configSchema: moodConfigSchema,
  dataSchema: moodDataSchema,
  valueSchema: scale,
  fields: [
    {
      key: 'energy',
      label: 'Energie',
      type: 'scale',
      min: 1,
      max: 5,
      required: false,
      deprecated: false,
    },
    {
      key: 'stress',
      label: 'Stress',
      type: 'scale',
      min: 1,
      max: 5,
      required: false,
      deprecated: false,
    },
    {
      key: 'wellbeing',
      label: 'Wohlbefinden',
      type: 'scale',
      min: 1,
      max: 5,
      required: false,
      deprecated: false,
    },
  ],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Stimmung', aggregate: 'avg' },
  defaultTrackers: [
    {
      key: 'mood',
      name: 'Stimmung',
      icon: 'smile',
      color: 'mood',
      config: {},
      widgets: [{ type: 'mood.today', size: 'md' }],
    },
  ],
};
