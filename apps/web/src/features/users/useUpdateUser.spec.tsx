import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { updateUser } from '../../api/users.js';
import { useUpdateUser } from './useUpdateUser.js';
import { validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  updateUser: vi.fn(),
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

describe('useUpdateUser', () => {
  it('calls updateUser with the id and the update data', async () => {
    vi.mocked(updateUser).mockResolvedValue(validUser);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateUser(1), { wrapper });
    result.current.mutate({ firstName: 'Jane' });

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(1, { firstName: 'Jane' }));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(updateUser).mockResolvedValue(validUser);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateUser(1), { wrapper });
    result.current.mutate({ firstName: 'Jane' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(updateUser).mockRejectedValue(new Error('conflict'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateUser(1), { wrapper });
    result.current.mutate({ email: 'taken@example.com' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('conflict'));
  });
});
