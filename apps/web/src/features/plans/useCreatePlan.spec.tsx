import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createPlan } from '../../api/plans.js';
import { useCreatePlan } from './useCreatePlan.js';
import { validPlan } from '../../test/fixtures.js';

vi.mock('../../api/plans.js', () => ({
  createPlan: vi.fn(),
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

describe('useCreatePlan', () => {
  it('calls createPlan with the plan data', async () => {
    vi.mocked(createPlan).mockResolvedValue(validPlan);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePlan(), { wrapper });
    result.current.mutate({ name: 'Unlimited Monthly', price: 2999 });

    await waitFor(() => expect(createPlan).toHaveBeenCalledWith({ name: 'Unlimited Monthly', price: 2999 }));
  });

  it('invalidates the plan queries on success', async () => {
    vi.mocked(createPlan).mockResolvedValue(validPlan);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePlan(), { wrapper });
    result.current.mutate({ name: 'Unlimited Monthly', price: 2999 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['plans'] });
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(createPlan).mockRejectedValue(new Error('bad request'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePlan(), { wrapper });
    result.current.mutate({ name: 'Unlimited Monthly', price: 2999 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('bad request'));
  });
});
