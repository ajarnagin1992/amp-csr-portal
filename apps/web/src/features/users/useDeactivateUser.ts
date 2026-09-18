import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deactivateUser } from '../../api/users.js';

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
