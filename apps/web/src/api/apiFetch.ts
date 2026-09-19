let onUnauthorized: (() => void) | undefined;

/**
 * Registers what happens when any API call comes back 401, i.e. the session
 * ended (expired, signed out elsewhere, CSR disabled). Pass nothing to clear it.
 */
export function setUnauthorizedHandler(handler?: () => void) {
  onUnauthorized = handler;
}

/** `fetch` for authenticated API calls: a 401 also notifies the unauthorized handler. */
export async function apiFetch(input: URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) onUnauthorized?.();
  return response;
}
