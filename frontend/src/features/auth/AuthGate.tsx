import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { FullScreenLoader, FullScreenMessage } from '@/components/FullScreenMessage';
import { de } from '@/lib/i18n/de';
import { useAuthStatus } from './auth-api';

/** Guards the app: first-time setup → login → app. */
export function AuthGate({ require }: { require: 'app' | 'login' | 'setup' }) {
  const status = useAuthStatus();
  const location = useLocation();

  if (status.isPending) return <FullScreenLoader label={de.common.loading} />;
  if (status.isError) {
    return (
      <FullScreenMessage>
        <p className="text-muted-foreground">{de.common.networkError}</p>
        <Button variant="outline" onClick={() => void status.refetch()}>
          {de.common.retry}
        </Button>
      </FullScreenMessage>
    );
  }

  const { setupRequired, authenticated } = status.data;
  const target = setupRequired ? 'setup' : authenticated ? 'app' : 'login';
  if (target === require) return <Outlet />;

  const paths = { app: '/', login: '/anmelden', setup: '/einrichtung' } as const;
  const from = (location.state as { from?: string } | null)?.from;
  const to = target === 'app' ? (from ?? '/') : paths[target];
  return (
    <Navigate
      to={to}
      replace
      state={target === 'login' ? { from: location.pathname } : undefined}
    />
  );
}
