import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUsers, type GetUsersParams } from '../../api/users.js';

export function useUsers(params: GetUsersParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData
  });
}
