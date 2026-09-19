import type { CookieOptions, Request } from 'express';
import type { CsrUserDto } from '@amp-csr/shared';

export const SESSION_COOKIE = 'csr_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  csrUser: CsrUserDto;
}

/**
 * HttpOnly keeps the token away from page scripts. SameSite=Strict means the
 * browser never attaches it to a cross-site request, which is the CSRF
 * defense; the portal and API share one origin through the gateway, so
 * nothing legitimate is cross-site. `secure` is off outside production
 * because local dev runs over plain http.
 */
export function sessionCookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' || !!process.env.RENDER,
    path: '/',
    ...(expires && { expires }),
  };
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
