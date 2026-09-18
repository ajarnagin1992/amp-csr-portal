import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUsers} from '../../api/users.js';
import type { GetUsersParamsDto } from '../../../../../packages/shared/dist/schemas/get-users-query.schema.js';

export function useUsers(params: GetUsersParamsDto = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData
  });
}
