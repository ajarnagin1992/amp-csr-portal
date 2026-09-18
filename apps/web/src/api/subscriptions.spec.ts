import { cancelSubscription, createSubscription, transferSubscription } from './subscriptions.js';

// The api client always calls fetch with a URL and, when it sends a body, a
// JSON string. Typing the mock that way keeps the assertions below type-safe.
type ClientFetch = (url: URL, init?: RequestInit & { body?: string }) => Promise<Response>;

function mockFetchOnce(ok = true, status = 200) {
  const fetchMock = vi.fn<ClientFetch>().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve({}),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a POST request to the subscriptions endpoint', async () => {
    const fetchMock = mockFetchOnce();

    await createSubscription({ vehicleId: 1, planId: 5 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions');
    expect(init?.method).toBe('POST');
  });

  it('sends the vehicleId and planId as the JSON request body', async () => {
    const fetchMock = mockFetchOnce();

    await createSubscription({ vehicleId: 1, planId: 5 });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body ?? '')).toEqual({ vehicleId: 1, planId: 5 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(false, 409);

    await expect(createSubscription({ vehicleId: 1, planId: 5 })).rejects.toThrow();
  });
});

describe('cancelSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a DELETE request to the subscription's endpoint", async () => {
    const fetchMock = mockFetchOnce();

    await cancelSubscription(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions/7');
    expect(init?.method).toBe('DELETE');
  });

  it('sends no request body', async () => {
    const fetchMock = mockFetchOnce();

    await cancelSubscription(7);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBeUndefined();
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(false, 404);

    await expect(cancelSubscription(7)).rejects.toThrow();
  });
});

describe('transferSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a POST request to the subscription's transfer endpoint", async () => {
    const fetchMock = mockFetchOnce();

    await transferSubscription(7, { vehicleId: 20 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions/7/transfer');
    expect(init?.method).toBe('POST');
  });

  it('sends the target vehicleId as the JSON request body', async () => {
    const fetchMock = mockFetchOnce();

    await transferSubscription(7, { vehicleId: 20 });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body ?? '')).toEqual({ vehicleId: 20 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(false, 409);

    await expect(transferSubscription(7, { vehicleId: 20 })).rejects.toThrow();
  });
});
