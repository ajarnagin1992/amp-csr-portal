import { getCurrentCsr, login, LoginError, logout } from './auth.js';
import { setUnauthorizedHandler } from './apiFetch.js';

type ClientFetch = (url: URL, init?: RequestInit & { body?: string }) => Promise<Response>;

const csr = { id: 1, username: 'csr', email: 'csr@example.com' };

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn<ClientFetch>().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler();
});

describe('getCurrentCsr', () => {
  it('requests the session endpoint', async () => {
    const fetchMock = mockFetchOnce(csr);

    await getCurrentCsr();

    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/me');
  });

  it('returns the parsed CSR when signed in', async () => {
    mockFetchOnce(csr);

    await expect(getCurrentCsr()).resolves.toEqual(csr);
  });

  it('returns undefined, not an error, when there is no session', async () => {
    mockFetchOnce({}, false, 401);

    await expect(getCurrentCsr()).resolves.toBeUndefined();
  });

  it('does not treat the expected 401 as an ended session', async () => {
    mockFetchOnce({}, false, 401);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await getCurrentCsr();

    expect(handler).not.toHaveBeenCalled();
  });

  it('throws on any other failure status', async () => {
    mockFetchOnce({}, false, 500);

    await expect(getCurrentCsr()).rejects.toThrow('Failed to fetch session: 500');
  });

  it('throws when the response does not match the contract', async () => {
    mockFetchOnce({ id: 'one' });

    await expect(getCurrentCsr()).rejects.toThrow();
  });
});

describe('login', () => {
  it('POSTs the credentials as JSON to the login endpoint', async () => {
    const fetchMock = mockFetchOnce(csr);

    await login({ email: 'csr@example.com', password: 'pw' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/auth/login');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body ?? '')).toEqual({ email: 'csr@example.com', password: 'pw' });
  });

  it('normalises the email the way the API will', async () => {
    const fetchMock = mockFetchOnce(csr);

    await login({ email: '  CSR@Example.com ', password: 'pw' });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body ?? '')).toMatchObject({ email: 'csr@example.com' });
  });

  it('returns the parsed CSR', async () => {
    mockFetchOnce(csr);

    await expect(login({ email: 'csr@example.com', password: 'pw' })).resolves.toEqual(csr);
  });

  it('throws a LoginError carrying the status when rejected', async () => {
    mockFetchOnce({}, false, 401);

    const error = await login({ email: 'csr@example.com', password: 'bad' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LoginError);
    expect((error as LoginError).status).toBe(401);
  });

  it('does not treat a wrong password as an ended session', async () => {
    mockFetchOnce({}, false, 401);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await login({ email: 'csr@example.com', password: 'bad' }).catch(() => undefined);

    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before making a request', async () => {
    const fetchMock = mockFetchOnce(csr);

    await expect(login({ email: 'not-an-email', password: 'pw' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('POSTs to the logout endpoint', async () => {
    const fetchMock = mockFetchOnce(undefined, true, 204);

    await logout();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/auth/logout');
    expect(init?.method).toBe('POST');
  });

  it('throws when the server does not confirm', async () => {
    mockFetchOnce(undefined, false, 500);

    await expect(logout()).rejects.toThrow('Failed to sign out: 500');
  });
});
