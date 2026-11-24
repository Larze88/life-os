import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH } from '@lifeos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { de } from '@/lib/i18n/de';
import { AuthCard } from './AuthCard';
import { useSetup } from './auth-api';
import { authErrorMessage } from './error-message';

export function SetupPage() {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const setup = useSetup();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH)
      return setLocalError(de.auth.passwordHint(PASSWORD_MIN_LENGTH));
    if (password !== repeat) return setLocalError(de.auth.passwordMismatch);
    setLocalError(null);
    setup.mutate(password);
  }

  const error = localError ?? (setup.isError ? authErrorMessage(setup.error) : null);

  return (
    <AuthCard title={de.auth.setupTitle} subtitle={de.auth.setupSubtitle}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{de.auth.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            {de.auth.passwordHint(PASSWORD_MIN_LENGTH)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password-repeat">{de.auth.passwordRepeat}</Label>
          <Input
            id="password-repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!password || !repeat || setup.isPending}>
          {de.auth.setup}
        </Button>
      </form>
    </AuthCard>
  );
}
