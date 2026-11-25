import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DaySummary, Entry, Tracker } from '@lifeos/shared';
import { json, mockApi } from '@/test/mock-api';
import { renderApp } from '@/test/render';

/**
 * Small in-memory backend: trackers + entries, day summary computed like the server
 * (sum for sleep, avg for mood, count for habits).
 */
function createFakeBackend() {
  const trackers: Tracker[] = [
    {
      id: 'mood-id',
      key: 'mood',
      module: 'mood',
      name: 'Stimmung',
      icon: null,
      color: 'mood',
      config: {},
      sortOrder: 1,
    },
    {
      id: 'sleep-id',
      key: 'sleep',
      module: 'sleep',
      name: 'Schlaf',
      icon: null,
      color: 'sleep',
      config: {},
      sortOrder: 2,
    },
  ];
  const entries: (Entry & { deleted?: boolean })[] = [];
  const widgets = [
    {
      id: 'w1',
      widgetType: 'mood.today',
      trackerId: 'mood-id',
      position: 0,
      size: 'md' as const,
      config: {},
      hidden: false,
    },
    {
      id: 'w2',
      widgetType: 'sleep.last_night',
      trackerId: 'sleep-id',
      position: 1,
      size: 'md' as const,
      config: {},
      hidden: false,
    },
    {
      id: 'w3',
      widgetType: 'habits.today',
      trackerId: null,
      position: 2,
      size: 'md' as const,
      config: {},
      hidden: false,
    },
  ];
  const live = () => entries.filter((e) => !e.deleted);

  function summary(date: string): DaySummary {
    return {
      date,
      widgets,
      trackers: trackers.map((tracker) => {
        const values = live()
          .filter((e) => e.trackerId === tracker.id)
          .map((e) => e.value ?? 0);
        const value =
          values.length === 0
            ? null
            : tracker.module === 'mood'
              ? values.reduce((a, b) => a + b, 0) / values.length
              : tracker.module === 'habit'
                ? values.length
                : values.reduce((a, b) => a + b, 0);
        return {
          tracker,
          value,
          count: values.length,
          goal:
            tracker.module === 'sleep'
              ? {
                  id: 'g',
                  trackerId: tracker.id,
                  metric: 'sum',
                  period: 'day',
                  comparator: 'gte',
                  target: 420,
                  targetMax: null,
                  validFrom: '2000-01-01',
                  validTo: null,
                }
              : null,
        };
      }),
    };
  }

  mockApi({
    'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
    'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
    'GET /api/v1/backups/status': () => json({ lastDownloadAt: null, firstEntryAt: null }),
    'GET /api/v1/days/*': (url) => json(summary(url.pathname.split('/').pop()!)),
    'GET /api/v1/entries': (url) => {
      const trackerId = url.searchParams.get('trackerId');
      return json(live().filter((e) => !trackerId || e.trackerId === trackerId));
    },
    'PUT /api/v1/entries/*': (url, init) => {
      const body = JSON.parse(String(init?.body)) as Entry;
      const id = url.pathname.split('/').pop()!;
      const value = body.endsAt
        ? Math.round((Date.parse(body.endsAt) - Date.parse(body.occurredAt)) / 60000)
        : body.value;
      const entry = {
        ...body,
        id,
        value,
        localDate: '',
        note: body.note ?? null,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
        data: body.data ?? {},
      } as Entry;
      entries.push(entry);
      return json(entry, 201);
    },
    'DELETE /api/v1/entries/*': (url) => {
      const e = entries.find((x) => x.id === url.pathname.split('/').pop());
      if (e) e.deleted = true;
      return new Response(null, { status: 204 });
    },
    'POST /api/v1/trackers': (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { name: string; config: unknown };
      const tracker: Tracker = {
        id: `habit-${trackers.length}`,
        key: `habit-${trackers.length}`,
        module: 'habit',
        name: body.name,
        icon: null,
        color: 'habit',
        config: body.config,
        sortOrder: trackers.length,
      };
      trackers.push(tracker);
      return json(tracker, 201);
    },
  });
  return { entries: live, trackers };
}

describe('mood, sleep and habit widgets', () => {
  let backend: ReturnType<typeof createFakeBackend>;
  beforeEach(() => {
    backend = createFakeBackend();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('records a mood with one tap', async () => {
    renderApp('/');
    const user = userEvent.setup();
    const widgetGroup = await screen.findAllByRole('radiogroup', { name: 'Wie geht es dir?' });
    await user.click(within(widgetGroup[0]!).getByRole('radio', { name: 'Gut' }));
    await waitFor(() => expect(backend.entries().map((e) => e.value)).toEqual([4]));
    expect(await screen.findByText('Stimmung „Gut“ gespeichert')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findAllByText('Gut')).not.toHaveLength(0);
  });

  it('records mood details from the detail sheet', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Stimmung-Details öffnen' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: 'Wie geht es dir?' })).getByRole(
        'radio',
        { name: 'Okay' },
      ),
    );
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: 'Energie' })).getByRole('radio', {
        name: '5 – hoch',
      }),
    );
    await user.type(within(dialog).getByLabelText('Notiz (optional)'), 'Langer Tag');
    await user.click(within(dialog).getByRole('button', { name: 'Stimmung speichern' }));
    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    expect(backend.entries()[0]).toMatchObject({
      value: 3,
      data: { energy: 5 },
      note: 'Langer Tag',
    });
  });

  it('records last night with bedtime, wake-up time and quality', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Schlaf eintragen' }));
    const dialog = await screen.findByRole('dialog');
    const bed = within(dialog).getByLabelText('Eingeschlafen');
    await user.clear(bed);
    await user.type(bed, '23:30');
    const wake = within(dialog).getByLabelText('Aufgewacht');
    await user.clear(wake);
    await user.type(wake, '07:15');
    expect(within(dialog).getByText('7 h 45 min')).toBeInTheDocument();
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: 'Schlafqualität' })).getByRole(
        'radio',
        { name: '4' },
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Schlaf speichern' }));

    await waitFor(() => expect(backend.entries()).toHaveLength(1));
    const entry = backend.entries()[0]!;
    expect(entry.data).toEqual({ quality: 4 });
    expect(new Date(entry.endsAt!).getHours()).toBe(7);
    expect(Date.parse(entry.endsAt!) - Date.parse(entry.occurredAt)).toBe(465 * 60_000);
    expect(await screen.findByText('7 h 45 min')).toBeInTheDocument();
  });

  it('creates a habit and ticks it off', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Gewohnheit anlegen' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Meditieren');
    await user.click(within(dialog).getByRole('button', { name: 'Gewohnheit anlegen' }));
    await waitFor(() => expect(backend.trackers.some((t) => t.name === 'Meditieren')).toBe(true));
    expect(backend.trackers.find((t) => t.name === 'Meditieren')?.config).toEqual({
      schedule: { type: 'daily' },
      targetPerDay: 1,
    });
    await user.keyboard('{Escape}');

    await user.click(await screen.findByRole('button', { name: 'Meditieren abhaken' }));
    await waitFor(() => expect(backend.entries().map((e) => e.trackerId)).toEqual(['habit-2']));
    expect(await screen.findByText('Alles erledigt für heute')).toBeInTheDocument();

    // Tapping again takes the completion back.
    await user.click(
      await screen.findByRole('button', { name: 'Meditieren: letzte Erledigung zurücknehmen' }),
    );
    await waitFor(() => expect(backend.entries()).toHaveLength(0));
    expect(await screen.findByText('0 von 1 erledigt')).toBeInTheDocument();
  });
});
