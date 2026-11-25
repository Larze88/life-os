import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { PASSWORD_MIN_LENGTH, type Health } from '@lifeos/shared';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { APP_VERSION } from '@/lib/app-version';
import { queryKeys } from '@/lib/query-keys';
import { BackupSection } from './BackupSection';
import { useChangePassword, useLogout, useRevokeSession, useSessions } from '../auth/auth-api';

export function SettingsPage() {
  const logout = useLogout();
  return (
    <>
      <PageHeader title={de.settings.title} />
      <div className="flex flex-col gap-6">
        <Section title={de.settings.account}>
          <ChangePasswordForm />
          <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut /> {de.auth.logout}
          </Button>
        </Section>
        <Section id="datensicherung" title={de.backup.title} description={de.backup.description}>
          <BackupSection />
        </Section>
        <Section title={de.settings.devices} description={de.settings.devicesHint}>
          <SessionList />
        </Section>
        <Section title={de.settings.about}>
          <AboutInfo />
        </Section>
      </div>
    </>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children}
    </Card>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const change = useChangePassword();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrent('');
          setNew('');
          toast.success(de.settings.passwordChanged);
        },
      },
    );
  }

  const err = change.error instanceof ApiError ? change.error : null;
  const currentError = err?.fieldErrors('currentPassword')[0];
  const newError = err?.fieldErrors('newPassword')[0];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <p className="text-sm font-medium">{de.settings.changePassword}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="current-password">{de.settings.currentPassword}</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          aria-invalid={currentError ? true : undefined}
        />
        {currentError && <p className="text-sm text-destructive">{currentError}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">{de.settings.newPassword}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          aria-invalid={newError ? true : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {newError ?? de.auth.passwordHint(PASSWORD_MIN_LENGTH)}
        </p>
      </div>
      <Button
        type="submit"
        variant="secondary"
        disabled={!currentPassword || newPassword.length < PASSWORD_MIN_LENGTH || change.isPending}
      >
        {de.settings.save}
      </Button>
    </form>
  );
}

function SessionList() {
  const sessions = useSessions();
  const revoke = useRevokeSession();

  if (sessions.isPending)
    return <p className="text-sm text-muted-foreground">{de.common.loading}</p>;
  if (sessions.isError) return <p className="text-sm text-destructive">{de.common.error}</p>;

  return (
    <ul className="flex flex-col divide-y">
      {sessions.data.map((s) => {
        const Icon = /Android|iOS/.test(s.deviceLabel ?? '') ? Smartphone : Monitor;
        return (
          <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {s.deviceLabel ?? de.settings.unknownDevice}
                {s.current && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({de.settings.thisDevice})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {de.settings.lastSeen}: {formatDateTime(s.lastSeenAt)}
              </p>
            </div>
            {!s.current && (
              <Button
                size="sm"
                variant="ghost"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(s.id, { onSuccess: () => toast(de.settings.revoked) })}
              >
                {de.settings.revoke}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AboutInfo() {
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api<Health>('/health', { signal }),
  });
  return (
    <dl className="grid grid-cols-2 gap-y-2 text-sm">
      <dt className="text-muted-foreground">{de.settings.appVersion}</dt>
      <dd className="text-right tabular-nums">{APP_VERSION}</dd>
      <dt className="text-muted-foreground">{de.settings.serverVersion}</dt>
      <dd className="text-right tabular-nums">{health.data?.version ?? '–'}</dd>
      <dt className="text-muted-foreground">{de.settings.server}</dt>
      <dd className="text-right">
        {health.isSuccess ? de.settings.reachable : health.isError ? de.settings.unreachable : '…'}
      </dd>
    </dl>
  );
}
