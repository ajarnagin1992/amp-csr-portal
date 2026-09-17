import { validUser, validUserDetail } from '../test/fixtures.js';
import { getUser, getUsers } from './users.js';


function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
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
