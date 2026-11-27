import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBackend, tracker, widget } from '@/test/fake-backend';
import { renderApp } from '@/test/render';

afterEach(() => vi.unstubAllGlobals());

const coffee = {
  fields: [
    {
      key: 'f1',
      label: 'Tassen',
      type: 'number',
      unit: 'Tassen',
      required: true,
      deprecated: false,
    },
    {
      key: 'f2',
      label: 'Art',
      type: 'select',
      options: ['Kaffee', 'Espresso'],
      required: false,
      deprecated: false,
    },
  ],
  primaryField: 'f1',
  aggregate: 'sum',
};

describe('custom trackers', () => {
  it('creates a tracker with fields in the editor', async () => {
    const backend = createFakeBackend([], []);
    renderApp('/einstellungen');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Neuer Tracker' }));
    const dialog = await screen.findByRole('dialog', { name: 'Neuer eigener Tracker' });
    await user.type(within(dialog).getByLabelText('Name'), 'Koffein');
    await user.type(within(dialog).getByLabelText(/Symbol/), '☕');
    await user.type(within(dialog).getByLabelText('Bezeichnung 1'), 'Tassen');
    await user.type(within(dialog).getByLabelText('Einheit (optional) 1'), 'Tassen');
    await user.click(within(dialog).getByRole('button', { name: 'Feld hinzufügen' }));
    await user.type(within(dialog).getByLabelText('Bezeichnung 2'), 'Art');
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: 'Art 2' })).getByRole('radio', {
        name: 'Auswahl',
      }),
    );
    await user.type(within(dialog).getByLabelText(/Auswahlmöglichkeiten.* 2/), 'Kaffee, Espresso');
    // Primary value defaults to the first number field, summed per day.
    expect(
      within(
        within(dialog).getByRole('radiogroup', { name: 'Pro Tag zusammenfassen als' }),
      ).getByRole('radio', { name: 'Summe' }),
    ).toHaveAttribute('aria-checked', 'true');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(backend.trackers).toHaveLength(1));
    expect(backend.trackers[0]).toMatchObject({
      module: 'custom',
      name: 'Koffein',
      config: {
        fields: [
          { key: 'f1', label: 'Tassen', type: 'number', unit: 'Tassen', required: true },
          {
            key: 'f2',
            label: 'Art',
            type: 'select',
            options: ['Kaffee', 'Espresso'],
            required: false,
          },
        ],
        primaryField: 'f1',
        aggregate: 'sum',
      },
    });
  });

  it('records an entry through the generic field form', async () => {
    const backend = createFakeBackend(
      [tracker('coffee', 'custom', 'Koffein', coffee)],
      [widget('custom.tracker', 'coffee')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Eintragen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Koffein' });
    const save = within(dialog).getByRole('button', { name: 'Eintrag speichern' });
    expect(save).toBeDisabled(); // required field missing
    await user.type(within(dialog).getByLabelText('Tassen'), '2');
    await user.click(within(dialog).getByRole('radio', { name: 'Espresso' }));
    await user.click(save);
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]!.data).toEqual({ f1: 2, f2: 'Espresso' });
  });

  it('offers one-tap recording for a single yes/no field', async () => {
    const backend = createFakeBackend(
      [
        tracker('med', 'custom', 'Vitamin D', {
          fields: [
            { key: 'f1', label: 'Genommen', type: 'boolean', required: true, deprecated: false },
          ],
          primaryField: 'f1',
          aggregate: 'max',
        }),
      ],
      [widget('custom.tracker', 'med')],
    );
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '✓ Genommen' }));
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]!.data).toEqual({ f1: true });
  });

  it('locks type and primary value of existing fields when editing', async () => {
    createFakeBackend([tracker('coffee', 'custom', 'Koffein', coffee)], []);
    renderApp('/einstellungen');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Koffein Bearbeiten' }));
    const dialog = await screen.findByRole('dialog', { name: '„Koffein“ bearbeiten' });
    expect(within(dialog).queryByRole('radiogroup', { name: 'Art 1' })).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/Der Hauptwert kann nachträglich nicht geändert werden/),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole('checkbox', { name: 'Ausgeblendet' })).toHaveLength(2);
  });
});
