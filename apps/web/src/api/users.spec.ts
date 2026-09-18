import { validUser, validUserDetail } from '../test/fixtures.js';
import { deactivateUser, getUser, getUsers, reactivateUser, updateUser } from './users.js';


// The api client always calls fetch with a URL and, when it sends a body, a
// JSON string. Typing the mock that way keeps the assertions below type-safe.
type ClientFetch = (url: URL, init?: RequestInit & { body?: string }) => Promise<Response>;

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn<ClientFetch>().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getUsers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the users endpoint', async () => {
    const fetchMock = mockFetchOnce({ data: [validUser], total: 1 });

    await getUsers();

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/users');
  });

  it('includes page, pageSize, and search as query params when provided', async () => {
    const fetchMock = mockFetchOnce({ data: [], total: 0 });

    await getUsers({ page: 2, pageSize: 5, search: 'jane' });

    const [url] = fetchMock.mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('pageSize')).toBe('5');
    expect(requestUrl.searchParams.get('search')).toBe('jane');
  });

  it('returns the parsed data and total on a valid response', async () => {
    mockFetchOnce({ data: [validUser], total: 1 });

    const result = await getUsers();

    expect(result).toEqual({ data: [validUser], total: 1 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'server error' }, false, 500);

    await expect(getUsers()).rejects.toThrow();
  });

  it('rejects params that do not satisfy the shared params schema, without fetching', async () => {
    const fetchMock = mockFetchOnce({ data: [], total: 0 });

    await expect(getUsers({ page: 0 })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the response body does not match the shared schema', async () => {
    mockFetchOnce({ data: [{ ...validUser, status: 'BOGUS' }], total: 1 });

    await expect(getUsers()).rejects.toThrow();
  });
});

describe('getUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the user by id', async () => {
    const fetchMock = mockFetchOnce(validUserDetail);

    await getUser(1);

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/users/1');
  });

  it('returns the parsed user detail on a valid response', async () => {
    mockFetchOnce(validUserDetail);

    const result = await getUser(1);

    expect(result).toEqual(validUserDetail);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'not found' }, false, 404);

    await expect(getUser(1)).rejects.toThrow();
  });

  it('throws when the response body does not match the shared schema', async () => {
    mockFetchOnce({ ...validUserDetail, vehicles: undefined });

    await expect(getUser(1)).rejects.toThrow();
  });
});

describe('updateUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a PATCH request to the user's endpoint", async () => {
    const fetchMock = mockFetchOnce(validUser);

    await updateUser(1, { firstName: 'Jane' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/users/1');
    expect(init?.method).toBe('PATCH');
  });

  it('sends the update fields as the JSON request body', async () => {
    const fetchMock = mockFetchOnce(validUser);

    await updateUser(1, { firstName: 'Jane', email: 'jane@example.com' });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body ?? '')).toEqual({ firstName: 'Jane', email: 'jane@example.com' });
  });

  it('returns the parsed user on a valid response', async () => {
    mockFetchOnce(validUser);

    const result = await updateUser(1, { firstName: 'Jane' });

    expect(result).toEqual(validUser);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'conflict' }, false, 409);

    await expect(updateUser(1, { email: 'taken@example.com' })).rejects.toThrow();
  });

  it('throws when the response body does not match the shared schema', async () => {
    mockFetchOnce({ ...validUser, status: 'BOGUS' });

    await expect(updateUser(1, { firstName: 'Jane' })).rejects.toThrow();
  });
});

describe('deactivateUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a DELETE request to the user's endpoint", async () => {
    const fetchMock = mockFetchOnce(validUser);

    await deactivateUser(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/users/1');
    expect(init?.method).toBe('DELETE');
  });

  it('returns the parsed user on a valid response', async () => {
    mockFetchOnce(validUser);

    const result = await deactivateUser(1);

    expect(result).toEqual(validUser);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'not found' }, false, 404);

    await expect(deactivateUser(1)).rejects.toThrow();
  });
});

describe('reactivateUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a POST request to the user's reactivate endpoint", async () => {
    const fetchMock = mockFetchOnce(validUser);

    await reactivateUser(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/users/1/reactivate');
    expect(init?.method).toBe('POST');
  });

  it('returns the parsed user on a valid response', async () => {
    mockFetchOnce(validUser);

    const result = await reactivateUser(1);

    expect(result).toEqual(validUser);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'not found' }, false, 404);

    await expect(reactivateUser(1)).rejects.toThrow();
  });
});
