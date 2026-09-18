import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createSubscription } from '../../api/subscriptions.js';
import { useCreateSubscription } from './useCreateSubscription.js';

vi.mock('../../api/subscriptions.js', () => ({
  createSubscription: vi.fn(),
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

describe('useCreateSubscription', () => {
  it('calls createSubscription with the vehicleId and planId', async () => {
    vi.mocked(createSubscription).mockResolvedValue(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateSubscription(), { wrapper });
    result.current.mutate({ vehicleId: 1, planId: 5 });

    await waitFor(() => expect(createSubscription).toHaveBeenCalledWith({ vehicleId: 1, planId: 5 }));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(createSubscription).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateSubscription(), { wrapper });
    result.current.mutate({ vehicleId: 1, planId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(createSubscription).mockRejectedValue(new Error('conflict'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateSubscription(), { wrapper });
    result.current.mutate({ vehicleId: 1, planId: 5 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('conflict'));
  });
});
