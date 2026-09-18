const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Builds an absolute URL for an API path.
 *
 * VITE_API_URL is a same-origin path (`/api`, proxied to the API by the
 * Cloudflare Worker) in production, and an absolute origin
 * (`http://localhost:3000`) in development. `new URL(path, base)` cannot
 * express the production case: a relative base throws `Invalid URL`, and even
 * with an absolute base a root-relative path would discard the `/api` prefix.
 *
 * Joining base and path first, then resolving against the page origin, handles
 * both. When API_BASE_URL is already absolute it wins over the origin, so
 * development is unaffected.
 */
export function apiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin);
}
