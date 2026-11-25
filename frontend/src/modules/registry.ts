import type { ComponentType } from 'react';
import type { FrontendModule, WidgetProps } from './types';
import { habitFrontend } from './habit';
import { moodFrontend } from './mood';
import { sleepFrontend } from './sleep';
import { waterFrontend } from './water';

/**
 * Registered frontend modules. Add new modules here (one line) —
 * see CLAUDE.md "Neues Modul hinzufügen".
 */
export const frontendModules: readonly FrontendModule[] = [
  waterFrontend,
  moodFrontend,
  sleepFrontend,
  habitFrontend,
];

export function getFrontendModule(id: string): FrontendModule | undefined {
  return frontendModules.find((m) => m.id === id);
}

const widgetComponents = new Map<string, ComponentType<WidgetProps>>(
  frontendModules.flatMap((m) => Object.entries(m.widgets)),
);

/** Resolves a widget type; unknown types (e.g. from a newer server) are skipped. */
export function getWidgetComponent(type: string): ComponentType<WidgetProps> | undefined {
  return widgetComponents.get(type);
}

export type { FrontendModule, WidgetProps } from './types';
