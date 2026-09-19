import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlan } from '../../api/plans.js';
import type { UpdatePlanDto } from '@amp-csr/shared';

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlanDto }) => updatePlan(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
      // A user's detail embeds each vehicle's plan, so an edit changes what those pages show.
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
