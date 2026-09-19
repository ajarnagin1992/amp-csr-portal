import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { logout } from '../../api/auth.js';
import { CURRENT_CSR_KEY } from './useCurrentCsr.js';
import { useLogout } from './useLogout.js';
import { validCsr } from '../../test/fixtures.js';

vi.mock('../../api/auth.js', () => ({
  logout: vi.fn(),
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

describe('useLogout', () => {
  it('signs the CSR out and drops their cached data once the server confirms', async () => {
    vi.mocked(logout).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(CURRENT_CSR_KEY, { csr: validCsr });
    queryClient.setQueryData(['users'], { data: [], total: 0 });

    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(CURRENT_CSR_KEY)).toEqual({ csr: undefined });
    expect(queryClient.getQueryData(['users'])).toBeUndefined();
  });

  it('keeps the CSR signed in when the server does not confirm', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('offline'));
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(CURRENT_CSR_KEY, { csr: validCsr });

    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(CURRENT_CSR_KEY)).toEqual({ csr: validCsr });
  });
});
