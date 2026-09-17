import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscription } from '../../api/subscriptions.js';

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleId, planId }: { vehicleId: number; planId: number }) =>
      createSubscription(vehicleId, planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
