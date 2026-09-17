import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transferSubscription } from '../../api/subscriptions.js';

export function useTransferSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, transferVehicleId }: { id: number; transferVehicleId: number }) =>
      transferSubscription(id, transferVehicleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
