import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '../../api/users.js';
import type { UpdateUserDto } from '@amp-csr/shared';

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserDto) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
