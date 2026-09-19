import { apiFetch, setUnauthorizedHandler } from './apiFetch.js';

function stubFetch(status: number) {
  const response = { ok: status >= 200 && status < 300, status } as Response;
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, response };
}

describe('apiFetch', () => {
  afterEach(() => {
    setUnauthorizedHandler();
    vi.unstubAllGlobals();
  });

  it('passes the url and init through to fetch and returns the response', async () => {
    const { fetchMock, response } = stubFetch(200);
    const url = new URL('http://localhost/api/users');
    const init = { method: 'POST' };

    await expect(apiFetch(url, init)).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(url, init);
  });

  it('notifies the unauthorized handler on a 401', async () => {
    stubFetch(401);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await apiFetch(new URL('http://localhost/api/users'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('still returns the 401 response so the caller can report its own error', async () => {
    const { response } = stubFetch(401);
    setUnauthorizedHandler(vi.fn());

    await expect(apiFetch(new URL('http://localhost/api/users'))).resolves.toBe(response);
  });

  it.each([200, 400, 403, 404, 500])('does not notify the handler on a %i', async (status) => {
    stubFetch(status);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await apiFetch(new URL('http://localhost/api/users'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('copes with a 401 when no handler is registered', async () => {
    stubFetch(401);

    await expect(apiFetch(new URL('http://localhost/api/users'))).resolves.toMatchObject({ status: 401 });
  });

  it('stops notifying once the handler is cleared', async () => {
    stubFetch(401);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setUnauthorizedHandler();

    await apiFetch(new URL('http://localhost/api/users'));

    expect(handler).not.toHaveBeenCalled();
  });
});
