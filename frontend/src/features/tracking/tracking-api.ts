import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  moduleRegistry,
  todayLocalDate,
  uuidv7,
  type DaySummary,
  type Entry,
  type EntryUpsert,
  type Goal,
  type Settings,
  type Tracker,
  type TrackerUpdate,
} from '@lifeos/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => api<Settings>('/settings', { signal }),
    staleTime: Infinity,
  });
}

/** Day start from settings, '00:00' until loaded. */
export function useDayStart(): string {
  return useSettings().data?.dayStart ?? '00:00';
}

export function useToday(): string {
  return todayLocalDate(new Date(), useDayStart());
}

export function useDay(date: string) {
  return useQuery({
    queryKey: queryKeys.day(date),
    queryFn: ({ signal }) => api<DaySummary>(`/days/${date}`, { signal }),
  });
}

export function useEntries(trackerId: string, from: string, to: string = from) {
  return useQuery({
    queryKey: queryKeys.entries(trackerId, from, to),
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?trackerId=${encodeURIComponent(trackerId)}&from=${from}&to=${to}`, {
        signal,
      }),
  });
}

/** Applies a value change to the cached day summary (only for additive aggregates). */
function patchDay(
  client: QueryClient,
  date: string,
  trackerId: string,
  deltaValue: number,
  deltaCount: number,
) {
  client.setQueryData<DaySummary>(queryKeys.day(date), (day) => {
    if (!day) return day;
    return {
      ...day,
      trackers: day.trackers.map((t) => {
        if (t.tracker.id !== trackerId) return t;
        const aggregate = moduleRegistry.get(t.tracker.module)?.primaryValue.aggregate;
        if (aggregate !== 'sum' && aggregate !== 'count') return t;
        const delta = aggregate === 'count' ? deltaCount : deltaValue;
        const count = Math.max(0, t.count + deltaCount);
        const value = count === 0 ? null : (t.value ?? 0) + delta;
        return { ...t, count, value };
      }),
    };
  });
}

export interface AddEntryVariables {
  /** Logical day the entry is shown under (for the optimistic update). */
  date: string;
  entry: EntryUpsert;
  /** Optional fixed id, e.g. when retrying. */
  id?: string;
}

/** Creates an entry with an optimistic dashboard update and rollback on failure. */
export function useAddEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entry }: AddEntryVariables & { id: string }) =>
      api<Entry>(`/entries/${id}`, { method: 'PUT', body: entry }),
    onMutate: async ({ date, entry }) => {
      await client.cancelQueries({ queryKey: queryKeys.day(date) });
      const previous = client.getQueryData<DaySummary>(queryKeys.day(date));
      patchDay(client, date, entry.trackerId, entry.value ?? 0, 1);
      return { previous };
    },
    onError: (_err, { date }, context) => {
      if (context?.previous) client.setQueryData(queryKeys.day(date), context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}

/** Convenience: generates the client-side id (UUIDv7, ADR-004). */
export function newEntryId(): string {
  return uuidv7();
}

export function useUpdateEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: EntryUpsert }) =>
      api<Entry>(`/entries/${id}`, { method: 'PUT', body: entry }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}

export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; date: string; trackerId: string; value: number | null }) =>
      api(`/entries/${id}`, { method: 'DELETE' }),
    onMutate: async ({ date, trackerId, value }) => {
      await client.cancelQueries({ queryKey: queryKeys.day(date) });
      const previous = client.getQueryData<DaySummary>(queryKeys.day(date));
      patchDay(client, date, trackerId, -(value ?? 0), -1);
      return { previous };
    },
    onError: (_err, { date }, context) => {
      if (context?.previous) client.setQueryData(queryKeys.day(date), context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}

export function useUpdateTracker() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: TrackerUpdate }) =>
      api<Tracker>(`/trackers/${id}`, { method: 'PATCH', body: update }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}

export function useUpdateGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackerId,
      target,
      effectiveFrom,
    }: {
      trackerId: string;
      target: number;
      effectiveFrom: string;
    }) =>
      api<Goal>(`/trackers/${trackerId}/goal`, { method: 'PUT', body: { target, effectiveFrom } }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}
