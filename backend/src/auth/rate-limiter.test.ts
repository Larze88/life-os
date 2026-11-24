import { describe, expect, it } from 'vitest';
import { LoginRateLimiter } from './rate-limiter.ts';

describe('LoginRateLimiter', () => {
  it('blocks after the maximum number of failures and recovers after the window', () => {
    let t = 0;
    const limiter = new LoginRateLimiter(3, 60_000, () => t);
    for (let i = 0; i < 3; i++) {
      expect(limiter.retryAfterSeconds()).toBe(0);
      limiter.recordFailure();
      t += 1000;
    }
    expect(limiter.retryAfterSeconds()).toBe(57);
    t = 60_001;
    expect(limiter.retryAfterSeconds()).toBe(0);
  });

  it('resets after a successful login', () => {
    const limiter = new LoginRateLimiter(1, 60_000, () => 0);
    limiter.recordFailure();
    expect(limiter.retryAfterSeconds()).toBeGreaterThan(0);
    limiter.reset();
    expect(limiter.retryAfterSeconds()).toBe(0);
  });
});
