import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, todayLocalDate, type History, type Tracker } from '@lifeos/shared';
import { json, mockApi } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const trackers: Tracker[] = [
  {
    id: 'water',
    key: 'water',
    module: 'water',
    name: 'Wasser',
    icon: null,
    color: 'water',
    config: {},
    sortOrder: 0,
  },
  {
    id: 'sleep',
    key: 'sleep',
    module: 'sleep',
    name: 'Schlaf',
    icon: null,
    color: 'sleep',
    config: {},
    sortOrder: 1,
  },
  {
    id: 'h1',
    key: 'h1',
    module: 'habit',
    name: 'Meditieren',
    icon: null,
    color: 'habit',
    config: {},
    sortOrder: 2,
  },
  {
    id: 'meals',
    key: 'meals',
    module: 'meal',
    name: 'Ernährung',
    icon: null,
    color: 'meal',
    config: {},
    sortOrder: 3,
  },
];

afterEach(() => vi.unstubAllGlobals());

describe('history page', () => {
  it('lists recorded days with per-tracker summaries, loads older days and opens a day', async () => {
    const today = todayLocalDate();
    const old = addDays(today, -20);
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
      'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
      'GET /api/v1/health': () => json({ status: 'ok', version: 'test' }),
      'GET /api/v1/trackers': () => json(trackers),
      'GET /api/v1/days/*': (url) =>
        json({ date: url.pathname.split('/').pop(), trackers: [], widgets: [] }),
      'GET /api/v1/history': (url) => {
        const to = url.searchParams.get('to')!;
        const body: History =
          to === today
            ? {
                days: [
                  {
                    date: today,
                    trackers: [
                      { trackerId: 'water', value: 1750, count: 5 },
                      { trackerId: 'sleep', value: 465, count: 1 },
                      { trackerId: 'h1', value: 1, count: 1 },
                      { trackerId: 'meals', value: 2, count: 2 },
                    ],
                  },
                ],
                hasMoreBefore: true,
              }
            : {
                days: [{ date: old, trackers: [{ trackerId: 'water', value: 500, count: 1 }] }],
                hasMoreBefore: false,
              };
        return json(body);
      },
    });

    const { router } = renderApp('/verlauf');
    const user = userEvent.setup();
    expect(await screen.findByText('Wasser 1.750 ml')).toBeInTheDocument();
    expect(screen.getByText('Schlaf 7 h 45 min')).toBeInTheDocument();
    expect(screen.getByText('✓ Meditieren')).toBeInTheDocument();
    expect(screen.getByText('2 Mahlzeiten')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ältere Tage laden' }));
    expect(await screen.findByText('Wasser 500 ml')).toBeInTheDocument();
    expect(screen.getByText('Keine älteren Einträge.')).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: /öffnen$/ }).at(-1)!);
    await waitFor(() => expect(router.state.location.search).toBe(`?tag=${old}`));
  });

  it('shows an empty state without any entries', async () => {
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
      'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
      'GET /api/v1/health': () => json({ status: 'ok', version: 'test' }),
      'GET /api/v1/trackers': () => json(trackers),
      'GET /api/v1/history': () => json({ days: [], hasMoreBefore: false }),
    });
    renderApp('/verlauf');
    expect(await screen.findByText(/Noch keine Einträge/)).toBeInTheDocument();
  });
});
