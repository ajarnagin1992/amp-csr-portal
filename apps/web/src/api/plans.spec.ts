import { getPlans } from './plans.js';

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getPlans', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the plans endpoint', async () => {
    const fetchMock = mockFetchOnce([]);

    await getPlans();

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/plans');
  });

  it('returns the parsed plans on a valid response', async () => {
    const plan = { id: 1, name: 'Unlimited Monthly', price: 2999, status: 'ACTIVE' };
    mockFetchOnce([plan]);

    const result = await getPlans();

    expect(result).toEqual([plan]);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'server error' }, false, 500);

    await expect(getPlans()).rejects.toThrow();
  });

  it('throws when the response body does not match the shared schema', async () => {
    mockFetchOnce([{ id: 1, name: 'Unlimited Monthly', price: 2999, status: 'BOGUS' }]);

    await expect(getPlans()).rejects.toThrow();
  });
});
