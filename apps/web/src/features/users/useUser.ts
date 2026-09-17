import { useQuery } from '@tanstack/react-query';
import { getUser } from '../../api/users.js';

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id),
  });
}
