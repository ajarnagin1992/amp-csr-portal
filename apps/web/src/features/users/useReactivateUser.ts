import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reactivateUser } from '../../api/users.js';

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reactivateUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
