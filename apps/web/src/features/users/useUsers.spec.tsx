import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getUsers } from '../../api/users.js';
import { useUsers } from './useUsers.js';
import { validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUsers: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUsers', () => {
  it('is pending while the request is in flight', () => {
    vi.mocked(getUsers).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
  });

  it('passes params through to getUsers', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [], total: 0 });

    renderHook(() => useUsers({ page: 2, pageSize: 5, search: 'jane' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(getUsers).toHaveBeenCalledWith({ page: 2, pageSize: 5, search: 'jane' }),
    );
  });

  it('resolves with the fetched data on success', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 });

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ data: [validUser], total: 1 });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(getUsers).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('network down'));
  });
});
