import { FAILED_LOGIN_WINDOW_MS, LoginThrottle, MAX_FAILED_LOGINS } from './login-throttle.js';

describe('LoginThrottle', () => {
  let throttle: LoginThrottle;

  beforeEach(() => {
    vi.useFakeTimers();
    throttle = new LoginThrottle();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function failTimes(key: string, times: number) {
    for (let i = 0; i < times; i++) throttle.recordFailure(key);
  }

  it('does not block an email that has never failed', () => {
    expect(throttle.isBlocked('a@example.com')).toBe(false);
  });

  it('allows failures up to the limit', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS - 1);
    expect(throttle.isBlocked('a@example.com')).toBe(false);
  });

  it('blocks once the limit is reached', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS);
    expect(throttle.isBlocked('a@example.com')).toBe(true);
  });

  it('tracks each email separately', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS);
    expect(throttle.isBlocked('b@example.com')).toBe(false);
  });

  it('unblocks after the window passes', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS);
    vi.advanceTimersByTime(FAILED_LOGIN_WINDOW_MS);
    expect(throttle.isBlocked('a@example.com')).toBe(false);
  });

  it('starts a fresh count once the window has passed', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS - 1);
    vi.advanceTimersByTime(FAILED_LOGIN_WINDOW_MS);
    failTimes('a@example.com', MAX_FAILED_LOGINS - 1);
    expect(throttle.isBlocked('a@example.com')).toBe(false);
  });

  it('clears the count on reset', () => {
    failTimes('a@example.com', MAX_FAILED_LOGINS);
    throttle.reset('a@example.com');
    expect(throttle.isBlocked('a@example.com')).toBe(false);
  });

  it('prunes expired entries so unique emails cannot grow memory without bound', () => {
    failTimes('stale@example.com', MAX_FAILED_LOGINS);
    vi.advanceTimersByTime(FAILED_LOGIN_WINDOW_MS);
    for (let i = 0; i < 1001; i++) throttle.recordFailure(`user${i}@example.com`);

    // The stale entry was swept, not merely expired: it is gone from the map.
    expect((throttle as unknown as { attempts: Map<string, unknown> }).attempts.has('stale@example.com')).toBe(false);
  });
});
