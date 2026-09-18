import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { deactivateUser } from '../../api/users.js';
import { useDeactivateUser } from './useDeactivateUser.js';
import { validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  deactivateUser: vi.fn(),
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

describe('useDeactivateUser', () => {
  it('calls deactivateUser with the user id', async () => {
    vi.mocked(deactivateUser).mockResolvedValue(validUser);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith(1));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(deactivateUser).mockResolvedValue(validUser);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(deactivateUser).mockRejectedValue(new Error('not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('not found'));
  });
});
