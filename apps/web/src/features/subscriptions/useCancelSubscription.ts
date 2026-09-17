import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelSubscription } from '../../api/subscriptions.js';

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelSubscription(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
