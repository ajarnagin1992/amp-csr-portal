import { useQuery } from '@tanstack/react-query';
import type { GetPlansRequestDto } from '@amp-csr/shared';
import { getPlans } from '../../api/plans.js';

// Active plans only unless includeDisabled is set — the subscription picker must never offer a disabled plan.
export function usePlans({ includeDisabled = false }: GetPlansRequestDto = {}) {
  return useQuery({
    queryKey: ['plans', { includeDisabled }],
    queryFn: () => getPlans({ includeDisabled }),
  });
}
