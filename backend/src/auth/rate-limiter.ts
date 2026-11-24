/**
 * In-memory limiter for failed login attempts (single instance, single user).
 * Failures are counted globally, not per IP: behind `tailscale serve` all requests
 * arrive from localhost anyway, and there is only one legitimate user.
 */
export class LoginRateLimiter {
  private failures: number[] = [];

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 15 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  private prune(): void {
    const cutoff = this.now() - this.windowMs;
    this.failures = this.failures.filter((t) => t > cutoff);
  }

  /** Seconds until the next attempt is allowed, or 0 if allowed now. */
  retryAfterSeconds(): number {
    this.prune();
    if (this.failures.length < this.maxFailures) return 0;
    const oldest = this.failures[0]!;
    return Math.max(1, Math.ceil((oldest + this.windowMs - this.now()) / 1000));
  }

  recordFailure(): void {
    this.failures.push(this.now());
  }

  reset(): void {
    this.failures = [];
  }
}
