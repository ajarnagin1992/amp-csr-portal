import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUsers} from '../../api/users.js';
import type { GetUsersRequestDto } from '../../../../../packages/shared/dist/schemas/get-users.schema.js';

export function useUsers(params: GetUsersRequestDto = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData
  });
}
