import { createPlan, getPlans, updatePlan } from './plans.js';
type ClientFetch = (url: URL, init?: RequestInit & { body?: string }) => Promise<Response>;

const plan = {
  id: 1,
  name: 'Unlimited Monthly',
  description: 'Unlimited exterior washes',
  price: 2999,
  status: 'ACTIVE',
};

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn<ClientFetch>().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
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
    mockFetchOnce([plan]);

    const result = await getPlans();

    expect(result).toEqual([plan]);
  });

  it('asks for active plans only unless includeDisabled is set', async () => {
    const fetchMock = mockFetchOnce([]);

    await getPlans();

    const [url] = fetchMock.mock.calls[0];
    expect(url.searchParams.has('includeDisabled')).toBe(false);
  });

  it('sends includeDisabled=true when asked for every plan', async () => {
    const fetchMock = mockFetchOnce([]);

    await getPlans({ includeDisabled: true });

    const [url] = fetchMock.mock.calls[0];
    expect(url.searchParams.get('includeDisabled')).toBe('true');
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'server error' }, false, 500);

    await expect(getPlans()).rejects.toThrow();
  });

  it('throws when the response body does not match the shared schema', async () => {
    mockFetchOnce([{ ...plan, status: 'BOGUS' }]);

    await expect(getPlans()).rejects.toThrow();
  });

  it('throws when a plan is missing its description', async () => {
    mockFetchOnce([{ ...plan, description: undefined }]);

    await expect(getPlans()).rejects.toThrow();
  });
});

describe('createPlan', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the plan as JSON to the plans endpoint', async () => {
    const fetchMock = mockFetchOnce(plan);

    await createPlan({ name: 'Unlimited Monthly', price: 2999 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/plans');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body ?? '')).toEqual({ name: 'Unlimited Monthly', price: 2999 });
  });

  it('returns the created plan', async () => {
    mockFetchOnce(plan);

    await expect(createPlan({ name: 'Unlimited Monthly', price: 2999 })).resolves.toEqual(plan);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'bad request' }, false, 400);

    await expect(createPlan({ name: 'Unlimited Monthly', price: 2999 })).rejects.toThrow();
  });
});

describe('updatePlan', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PATCHes the plan by id with the partial data as JSON', async () => {
    const fetchMock = mockFetchOnce(plan);

    await updatePlan(1, { price: 3999 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/plans/1');
    expect(init?.method).toBe('PATCH');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body ?? '')).toEqual({ price: 3999 });
  });

  it('returns the updated plan', async () => {
    mockFetchOnce({ ...plan, price: 3999 });

    await expect(updatePlan(1, { price: 3999 })).resolves.toEqual({ ...plan, price: 3999 });
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({ message: 'not found' }, false, 404);

    await expect(updatePlan(999, { price: 3999 })).rejects.toThrow();
  });
});
