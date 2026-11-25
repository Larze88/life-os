import {
  moduleRegistry,
  type DaySummary,
  type Entry,
  type Tracker,
  type Widget,
} from '@lifeos/shared';
import { json, mockApi } from './mock-api';

/**
 * Small in-memory Life OS backend for UI tests. Aggregates like the server, using the
 * real module registry (sum/avg/max/last/count). All entries count for every day.
 */
export function createFakeBackend(trackers: Tracker[], widgets: Widget[]) {
  const entries: (Entry & { deleted?: boolean })[] = [];
  const live = () => entries.filter((e) => !e.deleted);

  function aggregate(module: string, values: (number | null)[]): number | null {
    const agg = moduleRegistry.get(module)?.primaryValue.aggregate ?? 'sum';
    const nums = values.filter((v): v is number => v !== null);
    if (agg === 'count') return values.length || null;
    if (nums.length === 0) return null;
    if (agg === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (agg === 'max') return Math.max(...nums);
    if (agg === 'last') return nums[nums.length - 1]!;
    return nums.reduce((a, b) => a + b, 0);
  }

  function summary(date: string): DaySummary {
    return {
      date,
      widgets: widgets.filter((w) => !w.hidden),
      trackers: trackers.map((tracker) => {
        const values = live()
          .filter((e) => e.trackerId === tracker.id)
          .map((e) => e.value);
        return {
          tracker,
          value: aggregate(tracker.module, values),
          count: values.length,
          goal: null,
        };
      }),
    };
  }

  mockApi({
    'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
    'GET /api/v1/settings': () => json({ dayStart: '00:00' }),
    'GET /api/v1/health': () => json({ status: 'ok', version: 'test' }),
    'GET /api/v1/backups/status': () => json({ lastDownloadAt: null, firstEntryAt: null }),
    'GET /api/v1/days/*': (url) => json(summary(url.pathname.split('/').pop()!)),
    'GET /api/v1/entries': (url) => {
      const trackerId = url.searchParams.get('trackerId');
      // Like the real server: an empty trackerId is a validation error.
      if (trackerId === '') return json({ title: 'Bad Request', status: 400 }, 400);
      return json(live().filter((e) => !trackerId || e.trackerId === trackerId));
    },
    'PUT /api/v1/entries/*': (url, init) => {
      const body = JSON.parse(String(init?.body)) as Partial<Entry>;
      const id = url.pathname.split('/').pop()!;
      const entry = {
        id,
        trackerId: body.trackerId!,
        occurredAt: body.occurredAt!,
        endsAt: body.endsAt ?? null,
        localDate: '2026-11-25',
        tzOffsetMin: 60,
        value: body.value ?? null,
        data: body.data ?? {},
        note: body.note ?? null,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      } satisfies Entry;
      entries.push(entry);
      return json(entry, 201);
    },
    'DELETE /api/v1/entries/*': (url) => {
      const e = entries.find((x) => x.id === url.pathname.split('/').pop());
      if (e) e.deleted = true;
      return new Response(null, { status: 204 });
    },
    'GET /api/v1/dashboard': () => json({ widgets }),
    'PUT /api/v1/dashboard/layout': (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { widgets: { id: string; hidden: boolean }[] };
      const reordered = body.widgets.map((item, position) => ({
        ...widgets.find((w) => w.id === item.id)!,
        hidden: item.hidden,
        position,
      }));
      widgets.splice(0, widgets.length, ...reordered);
      return json({ widgets });
    },
    'GET /api/v1/trackers': () => json(trackers),
    'POST /api/v1/trackers': (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        module: string;
        name: string;
        config: unknown;
      };
      const tracker: Tracker = {
        id: `t-${trackers.length}`,
        key: `k-${trackers.length}`,
        module: body.module,
        name: body.name,
        icon: null,
        color: body.module,
        config: body.config,
        sortOrder: trackers.length,
      };
      trackers.push(tracker);
      return json(tracker, 201);
    },
    'PATCH /api/v1/trackers/*': (url, init) => {
      const tracker = trackers.find((t) => t.id === url.pathname.split('/').pop());
      if (!tracker) return json({ title: 'Not Found', status: 404 }, 404);
      Object.assign(tracker, JSON.parse(String(init?.body)) as Partial<Tracker>);
      return json(tracker);
    },
  });

  return { entries: live, trackers };
}

export function tracker(id: string, module: string, name: string, config: unknown = {}): Tracker {
  return { id, key: id, module, name, icon: null, color: module, config, sortOrder: 0 };
}

export function widget(widgetType: string, trackerId: string | null): Widget {
  return {
    id: `w-${widgetType}`,
    widgetType,
    trackerId,
    position: 0,
    size: 'md',
    config: {},
    hidden: false,
  };
}
