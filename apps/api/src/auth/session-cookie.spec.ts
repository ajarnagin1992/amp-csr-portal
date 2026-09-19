import type { Request } from 'express';
import { readCookie, SESSION_COOKIE, sessionCookieOptions } from './session-cookie.js';

const requestWith = (cookie?: string) => ({ headers: cookie === undefined ? {} : { cookie } }) as Request;

describe('readCookie', () => {
  it('returns undefined when there is no Cookie header', () => {
    expect(readCookie(requestWith(), SESSION_COOKIE)).toBeUndefined();
  });

  it('reads a single cookie', () => {
    expect(readCookie(requestWith('csr_session=abc123'), SESSION_COOKIE)).toBe('abc123');
  });

  it('finds the cookie among others', () => {
    expect(readCookie(requestWith('theme=dark; csr_session=abc123; lang=en'), SESSION_COOKIE)).toBe('abc123');
  });

  it('does not match a cookie whose name merely ends with the target', () => {
    expect(readCookie(requestWith('not_csr_session=nope'), SESSION_COOKIE)).toBeUndefined();
  });

  it('keeps `=` characters inside the value', () => {
    expect(readCookie(requestWith('csr_session=a=b=c'), SESSION_COOKIE)).toBe('a=b=c');
  });

  it('decodes percent-encoded values', () => {
    expect(readCookie(requestWith('csr_session=a%20b'), SESSION_COOKIE)).toBe('a b');
  });

  it('returns undefined for a value that is not valid percent-encoding', () => {
    expect(readCookie(requestWith('csr_session=%E0%A4%A'), SESSION_COOKIE)).toBeUndefined();
  });

  it('ignores parts without an `=`', () => {
    expect(readCookie(requestWith('garbage; csr_session=abc123'), SESSION_COOKIE)).toBe('abc123');
  });
});

describe('sessionCookieOptions', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('is HttpOnly and SameSite=Strict', () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/' });
  });

  it('carries the expiry when given one', () => {
    const expires = new Date('2026-01-01T00:00:00Z');
    expect(sessionCookieOptions(expires).expires).toBe(expires);
  });

  it('omits the expiry otherwise, so clearing the cookie matches how it was set', () => {
    expect(sessionCookieOptions()).not.toHaveProperty('expires');
  });

  it('is not Secure in local dev, which runs over plain http', () => {
    delete process.env.NODE_ENV;
    delete process.env.RENDER;
    expect(sessionCookieOptions().secure).toBe(false);
  });

  it('is Secure in production', () => {
    process.env.NODE_ENV = 'production';
    expect(sessionCookieOptions().secure).toBe(true);
  });

  it('is Secure on Render even when NODE_ENV is unset', () => {
    delete process.env.NODE_ENV;
    process.env.RENDER = 'true';
    expect(sessionCookieOptions().secure).toBe(true);
  });
});
