import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscription } from '../../api/subscriptions.js';
import type { CreateSubscriptionDto } from '@amp-csr/shared';

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionDto) => createSubscription(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
