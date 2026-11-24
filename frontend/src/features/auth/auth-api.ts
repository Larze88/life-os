import { hashKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthStatus, ChangePasswordRequest, SessionInfo } from '@lifeos/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useAuthStatus() {
  return useQuery({
    queryKey: queryKeys.authStatus,
    queryFn: ({ signal }) => api<AuthStatus>('/auth/status', { signal }),
    staleTime: 60_000,
  });
}

function useAuthMutation<TVariables>(fn: (vars: TVariables) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogin() {
  return useAuthMutation((password: string) =>
    api('/auth/login', { method: 'POST', body: { password } }),
  );
}

export function useSetup() {
  return useAuthMutation((password: string) =>
    api('/auth/setup', { method: 'POST', body: { password } }),
  );
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Mark as signed out (AuthGate redirects to login), then drop all other cached personal data.
      queryClient.setQueryData<AuthStatus>(queryKeys.authStatus, {
        setupRequired: false,
        authenticated: false,
      });
      queryClient.removeQueries({
        predicate: (q) => q.queryHash !== hashKey(queryKeys.authStatus),
      });
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: ({ signal }) => api<SessionInfo[]>('/auth/sessions', { signal }),
  });
}

export function useRevokeSession() {
  return useAuthMutation((id: string) =>
    api(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  );
}

export function useChangePassword() {
  return useAuthMutation((body: ChangePasswordRequest) =>
    api('/auth/password', { method: 'POST', body }),
  );
}
