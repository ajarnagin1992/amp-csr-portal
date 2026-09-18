import {
  getUsersRequestSchema,
  getUsersResponseSchema,
  mobileUserSchema,
  userDetailSchema,
  type GetUsersRequestDto,
  type ListUsersResponseDto,
  type MobileUserDto,
  type UpdateUserDto,
  type UserDetailDto,
} from '@amp-csr/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function getUsers(params: GetUsersRequestDto = {}): Promise<ListUsersResponseDto> {
  const { page, pageSize, search } = getUsersRequestSchema.parse(params);
  const url = new URL('/users', API_BASE_URL);
  if (page !== undefined) url.searchParams.set('page', String(page));
  if (pageSize !== undefined) url.searchParams.set('pageSize', String(pageSize));
  if (search !== undefined) url.searchParams.set('search', search);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const body: unknown = await response.json();
  return getUsersResponseSchema.parse(body);
}

export async function getUser(id: number): Promise<UserDetailDto> {
  const url = new URL(`/users/${id}`, API_BASE_URL);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return userDetailSchema.parse(body);
}

export async function updateUser(id: number, data: UpdateUserDto): Promise<MobileUserDto> {
  const url = new URL(`/users/${id}`, API_BASE_URL);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return mobileUserSchema.parse(body);
}

export async function deactivateUser(id: number): Promise<MobileUserDto> {
  const url = new URL(`/users/${id}`, API_BASE_URL);

  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to deactivate user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return mobileUserSchema.parse(body);
}

export async function reactivateUser(id: number): Promise<MobileUserDto> {
  const url = new URL(`/users/${id}/reactivate`, API_BASE_URL);

  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to reactivate user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return mobileUserSchema.parse(body);
}
