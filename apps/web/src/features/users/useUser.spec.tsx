import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getUser } from '../../api/users.js';
import { useUser } from './useUser.js';
import { validUserDetail } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUser: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUser', () => {
  it('is pending while the request is in flight', () => {
    vi.mocked(getUser).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUser(1), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
  });

  it('passes the id through to getUser', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderHook(() => useUser(1), { wrapper: createWrapper() });

    await waitFor(() => expect(getUser).toHaveBeenCalledWith(1));
  });

  it('resolves with the fetched data on success', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    const { result } = renderHook(() => useUser(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(validUserDetail);
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useUser(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('network down'));
  });
});
