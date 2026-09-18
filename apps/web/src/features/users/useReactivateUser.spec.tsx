import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { reactivateUser } from '../../api/users.js';
import { useReactivateUser } from './useReactivateUser.js';
import { validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  reactivateUser: vi.fn(),
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

describe('useReactivateUser', () => {
  it('calls reactivateUser with the user id', async () => {
    vi.mocked(reactivateUser).mockResolvedValue(validUser);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(reactivateUser).toHaveBeenCalledWith(1));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(reactivateUser).mockResolvedValue(validUser);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(reactivateUser).mockRejectedValue(new Error('not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('not found'));
  });
});
