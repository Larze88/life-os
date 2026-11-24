import { ApiError, NetworkError } from '@/lib/api';
import { de } from '@/lib/i18n/de';

/** Maps login/setup errors to a user-facing German message. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return de.common.networkError;
  if (error instanceof ApiError) {
    if (error.status === 401) return de.auth.wrongPassword;
    if (error.status === 429)
      return de.auth.tooManyAttempts(Math.ceil((error.retryAfterSeconds ?? 60) / 60));
    const field = error.fieldErrors('password')[0];
    if (field) return field;
  }
  return de.common.error;
}
