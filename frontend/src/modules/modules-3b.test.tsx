import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activityConfigSchema, mealConfigSchema, symptomConfigSchema } from '@lifeos/shared';
import { createFakeBackend, tracker, widget } from '@/test/fake-backend';
import { renderApp } from '@/test/render';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

describe('activity', () => {
  it('records an activity with type, duration and intensity', async () => {
    const backend = createFakeBackend(
      [tracker('activity', 'activity', 'Bewegung', activityConfigSchema.parse({}))],
      [widget('activity.today', 'activity')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aktivität eintragen' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: 'Laufen' }));
    await user.click(within(dialog).getByRole('radio', { name: '45 min' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Intensiv' }));
    await user.type(within(dialog).getByLabelText('Distanz in km (optional)'), '7,5');
    await user.click(within(dialog).getByRole('button', { name: 'Aktivität speichern' }));
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]).toMatchObject({
      value: 45,
      data: { type: 'Laufen', intensity: 3, distanceKm: 7.5 },
    });
    expect(await screen.findByText('45 min')).toBeInTheDocument();
  });
});

describe('measurements', () => {
  it('shows the latest value with unit and records new ones', async () => {
    const backend = createFakeBackend(
      [tracker('weight', 'measurement', 'Gewicht', { unit: 'kg', decimals: 1 })],
      [widget('measurements.overview', null)],
    );
    renderApp('/');
    const user = userEvent.setup();
    expect(await screen.findByText('noch kein Wert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gewicht öffnen' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Wert (kg)'), '78,4');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(backend.entries().map((e) => e.value)).toEqual([78.4]));
    expect(await within(dialog).findByText('78,4 kg')).toBeInTheDocument();
  });

  it('creates a custom measurement with a second value', async () => {
    const backend = createFakeBackend([], [widget('measurements.overview', null)]);
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Körperwerte verwalten' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Blutdruck');
    await user.type(within(dialog).getByLabelText('Einheit'), 'mmHg');
    await user.type(within(dialog).getByLabelText('Zweiter Wert (optional)'), 'diastolisch');
    await user.click(within(dialog).getByRole('button', { name: 'Messwert anlegen' }));
    await waitFor(() => expect(backend.trackers).toHaveLength(1));
    expect(backend.trackers[0]).toMatchObject({
      module: 'measurement',
      name: 'Blutdruck',
      config: { unit: 'mmHg', decimals: 0, secondaryLabel: 'diastolisch' },
    });
  });
});

describe('symptoms', () => {
  it('records a new symptom and adds it to the catalog', async () => {
    const backend = createFakeBackend(
      [tracker('symptoms', 'symptom', 'Beschwerden', symptomConfigSchema.parse({}))],
      [widget('symptoms.today', 'symptoms')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Beschwerde erfassen' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Andere Beschwerde'), 'Heuschnupfen');
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: /Stärke/ })).getByRole('radio', {
        name: '4',
      }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]).toMatchObject({ value: 4, data: { symptom: 'Heuschnupfen' } });
    await waitFor(() =>
      expect((backend.trackers[0]!.config as { catalog: string[] }).catalog).toContain(
        'Heuschnupfen',
      ),
    );
  });
});

describe('focus', () => {
  it('times a session and saves it with its start time', async () => {
    const backend = createFakeBackend(
      [tracker('focus', 'focus', 'Fokus')],
      [widget('focus.today', 'focus')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Timer starten' }));
    const started = localStorage.getItem('lifeos.focus.timerStart');
    expect(started).not.toBeNull();
    // Pretend the session started 50 minutes ago.
    const fiftyMinAgo = new Date(Date.now() - 50 * 60_000).toISOString();
    localStorage.setItem('lifeos.focus.timerStart', fiftyMinAgo);
    await user.click(screen.getByRole('button', { name: 'Timer verwerfen' }));
    expect(localStorage.getItem('lifeos.focus.timerStart')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Fokuszeit eintragen' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: '50 min' }));
    await user.type(within(dialog).getByLabelText('Woran? (optional)'), 'Bericht');
    await act(() =>
      user.click(within(dialog).getByRole('button', { name: 'Fokuszeit speichern' })),
    );
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]).toMatchObject({ value: 50, data: { task: 'Bericht' } });
  });
});

describe('meals', () => {
  it('records a meal with one tap and marks it as done', async () => {
    const backend = createFakeBackend(
      [tracker('meals', 'meal', 'Ernährung', mealConfigSchema.parse({}))],
      [widget('meals.today', 'meals')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Frühstück erfassen' }));
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]).toMatchObject({ value: null, data: { mealType: 'breakfast' } });
    expect(await screen.findByText('1 Mahlzeit')).toBeInTheDocument();
  });
});
