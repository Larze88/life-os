import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** A 401 anywhere means the session ended — re-check auth status, which redirects to login. */
export function createQueryClient(): QueryClient {
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      void client.invalidateQueries({ queryKey: queryKeys.authStatus });
    }
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: true,
      },
    },
  });
  return client;
}
