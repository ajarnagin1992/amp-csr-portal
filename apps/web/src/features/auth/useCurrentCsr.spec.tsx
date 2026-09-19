import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getCurrentCsr } from '../../api/auth.js';
import { CURRENT_CSR_KEY, endSession, useCurrentCsr } from './useCurrentCsr.js';
import { validCsr } from '../../test/fixtures.js';

vi.mock('../../api/auth.js', () => ({
  getCurrentCsr: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useCurrentCsr', () => {
  it('returns the signed-in CSR', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(validCsr);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCurrentCsr(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(validCsr));
  });

  it('returns undefined when nobody is signed in', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCurrentCsr(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('never goes stale, so it is not refetched on remount', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(validCsr);
    const { wrapper } = createWrapper();

    const first = renderHook(() => useCurrentCsr(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useCurrentCsr(), { wrapper });

    await waitFor(() => expect(second.result.current.data).toEqual(validCsr));
    expect(getCurrentCsr).toHaveBeenCalledTimes(1);
  });

  it('surfaces the error when the session check fails', async () => {
    vi.mocked(getCurrentCsr).mockRejectedValue(new Error('offline'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCurrentCsr(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('endSession', () => {
  it('marks the CSR signed out', () => {
    const { queryClient } = createWrapper();
    queryClient.setQueryData(CURRENT_CSR_KEY, { csr: validCsr });

    endSession(queryClient);

    expect(queryClient.getQueryData(CURRENT_CSR_KEY)).toEqual({ csr: undefined });
  });

  it("drops the previous CSR's cached data", () => {
    const { queryClient } = createWrapper();
    queryClient.setQueryData(['users', 1], { id: 1 });
    queryClient.setQueryData(['plans'], []);

    endSession(queryClient);

    expect(queryClient.getQueryData(['users', 1])).toBeUndefined();
    expect(queryClient.getQueryData(['plans'])).toBeUndefined();
  });
});
