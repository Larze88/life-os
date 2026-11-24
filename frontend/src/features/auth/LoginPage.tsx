import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { de } from '@/lib/i18n/de';
import { AuthCard } from './AuthCard';
import { useLogin } from './auth-api';
import { authErrorMessage } from './error-message';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const login = useLogin();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password) login.mutate(password);
  }

  const error = login.isError ? authErrorMessage(login.error) : null;

  return (
    <AuthCard title={de.auth.loginTitle} subtitle={de.auth.loginSubtitle}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{de.auth.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!password || login.isPending}>
          {de.auth.login}
        </Button>
      </form>
    </AuthCard>
  );
}
