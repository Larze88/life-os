import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardLayout, Widget } from '@lifeos/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useDashboardWidgets(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => api<{ widgets: Widget[] }>('/dashboard', { signal }),
    enabled,
  });
}

export function useSaveLayout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (layout: DashboardLayout) =>
      api<{ widgets: Widget[] }>('/dashboard/layout', { method: 'PUT', body: layout }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tracking }),
  });
}
