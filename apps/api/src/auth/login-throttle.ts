import { Injectable } from '@nestjs/common';

export const MAX_FAILED_LOGINS = 5;
export const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

const PRUNE_THRESHOLD = 1000;

interface Attempts {
  failures: number;
  windowStart: number;
}

/**
 * Locks an email out of logging in after too many failures in a window.
 *
 * Keyed by email, not IP: every request reaches the API through the gateway,
 * so the client IP isn't available. The trade-off is that someone who knows a
 * CSR's email can lock them out for the window. State is in memory, which is
 * enough for a single API instance; it resets on restart.
 */
@Injectable()
export class LoginThrottle {
  private readonly attempts = new Map<string, Attempts>();

  isBlocked(key: string): boolean {
    const entry = this.attempts.get(key);
    if (!entry) return false;
    if (Date.now() - entry.windowStart >= FAILED_LOGIN_WINDOW_MS) {
      this.attempts.delete(key);
      return false;
    }
    return entry.failures >= MAX_FAILED_LOGINS;
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (entry && now - entry.windowStart < FAILED_LOGIN_WINDOW_MS) {
      entry.failures += 1;
    } else {
      this.attempts.set(key, { failures: 1, windowStart: now });
    }
    if (this.attempts.size > PRUNE_THRESHOLD) this.prune(now);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.attempts) {
      if (now - entry.windowStart >= FAILED_LOGIN_WINDOW_MS) this.attempts.delete(key);
    }
  }
}
