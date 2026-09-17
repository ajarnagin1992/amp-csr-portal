import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { getPlans } from '../../api/plans.js';
import { usePlans } from './usePlans.js';
import { validSubscription } from '../../test/fixtures.js';

vi.mock('../../api/plans.js', () => ({
  getPlans: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePlans', () => {
  it('is pending while the request is in flight', () => {
    vi.mocked(getPlans).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
  });

  it('resolves with the fetched plans on success', async () => {
    const plans = [validSubscription.plan];
    vi.mocked(getPlans).mockResolvedValue(plans);

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(plans);
  });

  it('surfaces the error on failure', async () => {
    vi.mocked(getPlans).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('network down'));
  });
});
