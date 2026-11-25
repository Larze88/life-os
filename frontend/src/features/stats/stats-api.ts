import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Correlation, StatsSeries } from '@lifeos/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useStatsSeries(trackerId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.statsSeries(trackerId ?? '', from, to),
    queryFn: ({ signal }) =>
      api<StatsSeries>(
        `/stats/series?trackerId=${encodeURIComponent(trackerId!)}&from=${from}&to=${to}`,
        { signal },
      ),
    enabled: Boolean(trackerId),
    placeholderData: keepPreviousData,
  });
}

export function useCorrelation(
  a: string | undefined,
  b: string | undefined,
  from: string,
  to: string,
  lag: number,
) {
  return useQuery({
    queryKey: queryKeys.correlation(a ?? '', b ?? '', from, to, lag),
    queryFn: ({ signal }) =>
      api<Correlation>(
        `/stats/correlation?a=${encodeURIComponent(a!)}&b=${encodeURIComponent(b!)}&from=${from}&to=${to}&lag=${lag}`,
        { signal },
      ),
    enabled: Boolean(a && b && a !== b),
  });
}
