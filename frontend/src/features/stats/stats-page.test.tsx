import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatsSeries, Tracker } from '@lifeos/shared';
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
    config: { unit: 'ml', quickAmounts: [250] },
    sortOrder: 0,
  },
  {
    id: 'mood',
    key: 'mood',
    module: 'mood',
    name: 'Stimmung',
    icon: null,
    color: 'mood',
    config: {},
    sortOrder: 1,
  },
  {
    id: 'sleep',
    key: 'sleep',
    module: 'sleep',
    name: 'Schlaf',
    icon: null,
    color: 'sleep',
    config: {},
    sortOrder: 2,
  },
];

function series(trackerId: string, from: string, to: string): StatsSeries {
  const days = [];
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d <= new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const date = d.toISOString().slice(0, 10);
    days.push({
      date,
      value: trackerId === 'water' ? 1800 : 3,
      count: 1,
      met: trackerId === 'water' ? false : null,
    });
  }
  return {
    trackerId,
    aggregate: trackerId === 'water' ? 'sum' : 'avg',
    goalTarget: trackerId === 'water' ? 2000 : null,
    days,
    summary: {
      average: trackerId === 'water' ? 1800 : 3,
      min: 1800,
      max: 2400,
      total: 1800 * days.length,
      daysWithData: days.length,
      goal: trackerId === 'water' ? { met: 3, evaluated: days.length } : null,
    },
    streak: trackerId === 'water' ? { current: 0, longest: 2 } : null,
  };
}

describe('statistics page', () => {
  let requests: string[];
  beforeEach(() => {
    requests = [];
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
      'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
      'GET /api/v1/health': () => json({ status: 'ok', version: 'test' }),
      'GET /api/v1/trackers': () => json(trackers),
      'GET /api/v1/stats/series': (url) => {
        requests.push(url.search);
        return json(
          series(
            url.searchParams.get('trackerId')!,
            url.searchParams.get('from')!,
            url.searchParams.get('to')!,
          ),
        );
      },
      'GET /api/v1/stats/correlation': (url) =>
        json(
          url.searchParams.get('lag') === '1'
            ? { n: 5, rho: null, pairs: [] }
            : {
                n: 20,
                rho: 0.72,
                pairs: Array.from({ length: 20 }, (_, i) => ({
                  date: `2026-11-${String(i + 1).padStart(2, '0')}`,
                  a: 400 + i * 5,
                  b: 2 + i / 10,
                })),
              },
        ),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows average, chart, tiles and a table for the first tracker', async () => {
    renderApp('/statistik');
    expect((await screen.findAllByText('1.800 ml')).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Wasser, 30 Tage' })).toBeInTheDocument();
    expect(screen.getByText('Ziel erreicht')).toBeInTheDocument();
    expect(screen.getByText('3 von 30')).toBeInTheDocument();
    expect(screen.getByText('0 (beste: 2)')).toBeInTheDocument();
    expect(screen.getByText('Werte als Tabelle')).toBeInTheDocument();
  });

  it('switches tracker and period', async () => {
    renderApp('/statistik');
    const user = userEvent.setup();
    await screen.findAllByText('1.800 ml');
    await user.click(screen.getByRole('radio', { name: '1 Jahr' }));
    await waitFor(() =>
      expect(requests.some((r) => r.includes('trackerId=water') && r.includes('from='))).toBe(true),
    );
    expect(await screen.findByText('Monatswerte: Ø pro Tag')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Tracker' })).getByRole('radio', {
        name: 'Stimmung',
      }),
    );
    expect(await screen.findByRole('img', { name: 'Stimmung, 1 Jahr' })).toBeInTheDocument();
  });

  it('describes correlations without claiming causation', async () => {
    renderApp('/statistik');
    const user = userEvent.setup();
    expect(await screen.findByText(/deutlicher Zusammenhang/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'An Tagen mit höherem Wert bei „Schlaf“ war „Stimmung“ tendenziell ebenfalls höher.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/kein Beleg für Ursache und Wirkung/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/B am Folgetag/));
    expect(
      await screen.findByText('Noch zu wenige gemeinsame Tage (5 von mindestens 14).'),
    ).toBeInTheDocument();
  });
});
