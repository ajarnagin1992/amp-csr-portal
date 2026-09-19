const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Builds an absolute URL for an API path.
 *
 * The API base is a same-origin path (`/api`) in every environment: proxied to
 * the API by the Cloudflare Worker in production and by the Vite dev server
 * locally, so the API needs no CORS. `new URL(path, base)` cannot express
 * that: a relative base throws `Invalid URL`, and even with an absolute base a
 * root-relative path would discard the `/api` prefix.
 *
 * Joining base and path first, then resolving against the page origin, handles
 * it. VITE_API_URL may still be set to an absolute origin, which wins over the
 * page origin (that would need CORS enabled on the API).
 */
export function apiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin);
}
