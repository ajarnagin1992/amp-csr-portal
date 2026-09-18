import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { transferSubscription } from '../../api/subscriptions.js';
import { useTransferSubscription } from './useTransferSubscription.js';

vi.mock('../../api/subscriptions.js', () => ({
  transferSubscription: vi.fn(),
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

describe('useTransferSubscription', () => {
  it('calls transferSubscription with the subscription id and target vehicle id', async () => {
    vi.mocked(transferSubscription).mockResolvedValue(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTransferSubscription(), { wrapper });
    result.current.mutate({ id: 7, transferVehicleId: 20 });

    await waitFor(() => expect(transferSubscription).toHaveBeenCalledWith(7, { vehicleId: 20 }));
  });

  it('invalidates the user queries on success', async () => {
    vi.mocked(transferSubscription).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useTransferSubscription(), { wrapper });
    result.current.mutate({ id: 7, transferVehicleId: 20 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(transferSubscription).mockRejectedValue(new Error('conflict'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTransferSubscription(), { wrapper });
    result.current.mutate({ id: 7, transferVehicleId: 20 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('conflict'));
  });
});
