import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { cancelSubscription } from '../../api/subscriptions.js';
import { useCancelSubscription } from './useCancelSubscription.js';

vi.mock('../../api/subscriptions.js', () => ({
  cancelSubscription: vi.fn(),
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

describe('useCancelSubscription', () => {
  it('calls cancelSubscription with the subscription id', async () => {
    vi.mocked(cancelSubscription).mockResolvedValue(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCancelSubscription(), { wrapper });
    result.current.mutate(7);

    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledWith(7));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(cancelSubscription).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelSubscription(), { wrapper });
    result.current.mutate(7);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCancelSubscription(), { wrapper });
    result.current.mutate(7);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('not found'));
  });
});
