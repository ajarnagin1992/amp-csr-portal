import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { updatePlan } from '../../api/plans.js';
import { useUpdatePlan } from './useUpdatePlan.js';
import { validPlan } from '../../test/fixtures.js';

vi.mock('../../api/plans.js', () => ({
  updatePlan: vi.fn(),
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

describe('useUpdatePlan', () => {
  it('calls updatePlan with the id and the update data', async () => {
    vi.mocked(updatePlan).mockResolvedValue(validPlan);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePlan(), { wrapper });
    result.current.mutate({ id: 1, data: { price: 3999 } });

    await waitFor(() => expect(updatePlan).toHaveBeenCalledWith(1, { price: 3999 }));
  });

  it('invalidates the plan and user queries on success', async () => {
    vi.mocked(updatePlan).mockResolvedValue(validPlan);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePlan(), { wrapper });
    result.current.mutate({ id: 1, data: { price: 3999 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['plans'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(updatePlan).mockRejectedValue(new Error('not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePlan(), { wrapper });
    result.current.mutate({ id: 999, data: { price: 3999 } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('not found'));
  });
});
