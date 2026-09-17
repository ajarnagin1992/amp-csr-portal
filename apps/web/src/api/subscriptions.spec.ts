import { cancelSubscription, createSubscription, transferSubscription } from './subscriptions.js';

function mockFetchOnce(ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve({}),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a POST request to the subscriptions endpoint', async () => {
    const fetchMock = mockFetchOnce();

    await createSubscription(1, 5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions');
    expect(init.method).toBe('POST');
  });

  it('sends the vehicleId and planId as the JSON request body', async () => {
    const fetchMock = mockFetchOnce();

    await createSubscription(1, 5);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ vehicleId: 1, planId: 5 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(false, 409);

    await expect(createSubscription(1, 5)).rejects.toThrow();
  });
});

describe('cancelSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a PATCH request to the subscription's endpoint", async () => {
    const fetchMock = mockFetchOnce();

    await cancelSubscription(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions/7');
    expect(init.method).toBe('PATCH');
  });

  it('sends CANCELLED status as the JSON request body', async () => {
    const fetchMock = mockFetchOnce();

    await cancelSubscription(7);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ status: 'CANCELLED' });
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

  it("sends a PATCH request to the subscription's endpoint", async () => {
    const fetchMock = mockFetchOnce();

    await transferSubscription(7, 20);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/subscriptions/7');
    expect(init.method).toBe('PATCH');
  });

  it('sends the transferVehicleId as the JSON request body', async () => {
    const fetchMock = mockFetchOnce();

    await transferSubscription(7, 20);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ transferVehicleId: 20 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(false, 409);

    await expect(transferSubscription(7, 20)).rejects.toThrow();
  });
});
