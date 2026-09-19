import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { login } from '../../api/auth.js';
import { CURRENT_CSR_KEY } from './useCurrentCsr.js';
import { useLogin } from './useLogin.js';
import { validCsr } from '../../test/fixtures.js';

vi.mock('../../api/auth.js', () => ({
  login: vi.fn(),
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

describe('useLogin', () => {
  it('calls login with the credentials', async () => {
    vi.mocked(login).mockResolvedValue(validCsr);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'csr@example.com', password: 'pw' });

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'csr@example.com', password: 'pw' }));
  });

  it('stores the CSR as the current session on success', async () => {
    vi.mocked(login).mockResolvedValue(validCsr);
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'csr@example.com', password: 'pw' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(CURRENT_CSR_KEY)).toEqual({ csr: validCsr });
  });

  it('surfaces the error and leaves the session untouched on failure', async () => {
    vi.mocked(login).mockRejectedValue(new Error('nope'));
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(CURRENT_CSR_KEY, { csr: undefined });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'csr@example.com', password: 'bad' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('nope'));
    expect(queryClient.getQueryData(CURRENT_CSR_KEY)).toEqual({ csr: undefined });
  });
});
