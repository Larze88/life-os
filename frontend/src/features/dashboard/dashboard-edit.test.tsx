import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mealConfigSchema } from '@lifeos/shared';
import { createFakeBackend, tracker, widget } from '@/test/fake-backend';
import { renderApp } from '@/test/render';

afterEach(() => vi.unstubAllGlobals());

describe('dashboard customization', () => {
  it('hides and reorders widgets', async () => {
    const widgets = [
      widget('mood.today', 'mood'),
      widget('sleep.last_night', 'sleep'),
      widget('meals.today', 'meals'),
      widget('habits.today', null),
    ];
    createFakeBackend(
      [
        tracker('mood', 'mood', 'Stimmung'),
        tracker('sleep', 'sleep', 'Schlaf'),
        tracker('meals', 'meal', 'Ernährung', mealConfigSchema.parse({})),
      ],
      widgets,
    );
    renderApp('/');
    const user = userEvent.setup();
    expect(
      await screen.findByRole('button', { name: 'Ernährungs-Details öffnen' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anpassen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dashboard anpassen' });
    // Tracker-independent widgets are named by their module.
    expect(within(dialog).getByText('Gewohnheiten')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'Ernährung anzeigen' }));
    await user.click(within(dialog).getByRole('button', { name: 'Schlaf nach oben' }));
    expect(within(dialog).getByRole('button', { name: 'Schlaf nach oben' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(widgets.map((w) => w.widgetType)).toEqual([
        'sleep.last_night',
        'mood.today',
        'meals.today',
        'habits.today',
      ]),
    );
    expect(widgets.find((w) => w.widgetType === 'meals.today')?.hidden).toBe(true);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Ernährungs-Details öffnen' }),
      ).not.toBeInTheDocument(),
    );
    const order = screen
      .getAllByRole('button', { name: /Details öffnen$/ })
      .map((b) => b.getAttribute('aria-label'));
    expect(order).toEqual(['Schlaf-Details öffnen', 'Stimmung-Details öffnen']);
  });
});
