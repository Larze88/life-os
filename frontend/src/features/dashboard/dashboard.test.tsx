import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DaySummary } from '@lifeos/shared';
import { json, mockApi } from '@/test/mock-api';
import { renderApp } from '@/test/render';

function summary(date: string, value: number | null, count: number): DaySummary {
  return {
    date,
    trackers: [
      {
        tracker: {
          id: 'water-id',
          key: 'water',
          module: 'water',
          name: 'Wasser',
          icon: 'droplet',
          color: 'water',
          config: { unit: 'ml', quickAmounts: [250, 500] },
          sortOrder: 0,
        },
        value,
        count,
        goal: {
          id: 'g1',
          trackerId: 'water-id',
          metric: 'sum',
          period: 'day',
          comparator: 'gte',
          target: 2000,
          targetMax: null,
          validFrom: '2000-01-01',
          validTo: null,
        },
      },
    ],
    widgets: [
      {
        id: 'w1',
        widgetType: 'water.progress',
        trackerId: 'water-id',
        position: 0,
        size: 'md',
        config: {},
        hidden: false,
      },
    ],
  };
}

describe('dashboard with water widget', () => {
  let stored: { id: string; value: number }[];
  let failWrites: boolean;

  beforeEach(() => {
    stored = [];
    failWrites = false;
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
      'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
      'GET /api/v1/days/*': (url) => {
        const date = url.pathname.split('/').pop()!;
        const total = stored.reduce((a, e) => a + e.value, 0);
        return json(summary(date, stored.length ? total : null, stored.length));
      },
      'PUT /api/v1/entries/*': async (url, init) => {
        if (failWrites) throw new TypeError('Failed to fetch');
        const body = JSON.parse(String(init?.body)) as { value: number };
        const id = url.pathname.split('/').pop()!;
        stored.push({ id, value: body.value });
        return json({ id, ...body }, 201);
      },
      'DELETE /api/v1/entries/*': (url) => {
        const id = url.pathname.split('/').pop()!;
        stored = stored.filter((e) => e.id !== id);
        return new Response(null, { status: 204 });
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows progress towards the daily goal', async () => {
    renderApp('/');
    expect(await screen.findByText('Noch 2.000 ml bis 2.000 ml')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Fortschritt Wasser-Tagesziel' }),
    ).toHaveAttribute('aria-valuenow', '0');
  });

  it('adds water with one tap and allows undo', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '250 ml Wasser hinzufügen' }));

    expect(await screen.findByText('Noch 1.750 ml bis 2.000 ml')).toBeInTheDocument();
    expect(stored).toHaveLength(1);
    // The entry id is a client-generated UUIDv7.
    expect(stored[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);

    const toast = await screen.findByText('250 ml Wasser hinzugefügt');
    await user.click(within(toast.closest('li')!).getByRole('button', { name: 'Rückgängig' }));
    await waitFor(() => expect(stored).toHaveLength(0));
    expect(await screen.findByText('Noch 2.000 ml bis 2.000 ml')).toBeInTheDocument();
  });

  it('rolls back and reports when saving fails', async () => {
    failWrites = true;
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '500 ml Wasser hinzufügen' }));
    expect(
      await screen.findByText('Keine Verbindung – Eintrag wurde nicht gespeichert.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Noch 2.000 ml bis 2.000 ml')).toBeInTheDocument();
  });

  it('navigates to previous days', async () => {
    const { router } = renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Vorheriger Tag' }));
    await waitFor(() => expect(router.state.location.search).toMatch(/^\?tag=\d{4}-\d{2}-\d{2}$/));
    expect(await screen.findByRole('heading', { name: 'Rückblick' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Heute' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('opens the quick-add sheet from the plus button', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await screen.findByText('Noch 2.000 ml bis 2.000 ml');
    await user.click(screen.getAllByRole('button', { name: 'Erfassen' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Schnell erfassen' });
    await user.click(within(dialog).getByRole('button', { name: '500 ml Wasser hinzufügen' }));
    await waitFor(() => expect(stored.map((e) => e.value)).toEqual([500]));
  });
});
