import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transferSubscription } from '../../api/subscriptions.js';
import type { TransferSubscriptionDto } from '@amp-csr/shared';

export function useTransferSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransferSubscriptionDto }) => transferSubscription(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
