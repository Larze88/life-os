import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { Health } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { de } from '@/lib/i18n/de';
import { APP_VERSION } from '@/lib/app-version';
import { queryKeys } from '@/lib/query-keys';

/** Shown when the server runs a different version than this (cached) frontend. */
export function UpdateBanner() {
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api<Health>('/health', { signal }),
    staleTime: 5 * 60 * 1000,
  });
  const serverVersion = health.data?.version;
  if (
    !serverVersion ||
    serverVersion === APP_VERSION ||
    serverVersion.endsWith('-dev') ||
    APP_VERSION === 'test'
  )
    return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-3 rounded-2xl bg-sky-500/12 p-3 pl-4 text-sm ring-1 ring-sky-500/25"
    >
      <RefreshCw className="size-5 shrink-0 text-sky-600" />
      <span className="flex-1">{de.common.updateAvailable}</span>
      <Button size="sm" onClick={() => window.location.reload()}>
        {de.common.reload}
      </Button>
    </div>
  );
}
