import { toast } from 'sonner';
import type { EntryUpsert } from '@lifeos/shared';
import { NetworkError } from '@/lib/api';
import { entryMomentFor } from '@/lib/entry-time';
import { de } from '@/lib/i18n/de';
import { newEntryId, useAddEntry, useDayStart, useDeleteEntry } from './tracking-api';

/**
 * One-tap recording with an undo toast (docs/PRD.md §6 "Rückgängig direkt nach Schnellaktion").
 */
export function useQuickAdd() {
  const add = useAddEntry();
  const remove = useDeleteEntry();
  const dayStart = useDayStart();

  return {
    isPending: add.isPending,
    add(params: {
      date: string;
      trackerId: string;
      value: number | null;
      data?: Record<string, unknown>;
      source?: EntryUpsert['source'];
      message: string;
    }) {
      const id = newEntryId();
      const entry: EntryUpsert = {
        trackerId: params.trackerId,
        ...entryMomentFor(params.date, dayStart),
        value: params.value,
        data: params.data ?? {},
        source: params.source ?? 'quick_action',
      };
      add.mutate(
        { id, date: params.date, entry },
        {
          onSuccess: () => {
            toast.success(params.message, {
              duration: 5000,
              action: {
                label: de.common.undo,
                onClick: () =>
                  remove.mutate({
                    id,
                    date: params.date,
                    trackerId: params.trackerId,
                    value: params.value,
                  }),
              },
            });
          },
          onError: (error) => {
            toast.error(
              error instanceof NetworkError ? de.common.notSavedOffline : de.common.notSaved,
            );
          },
        },
      );
    },
  };
}
