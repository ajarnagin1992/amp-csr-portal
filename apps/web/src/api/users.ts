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

import { apiFetch } from './apiFetch.js';
import { apiUrl } from './apiUrl.js';

export async function getUsers(params: GetUsersRequestDto = {}): Promise<ListUsersResponseDto> {
  const { page, pageSize, search } = getUsersRequestSchema.parse(params);
  const url = apiUrl('/users');
  if (page !== undefined) url.searchParams.set('page', String(page));
  if (pageSize !== undefined) url.searchParams.set('pageSize', String(pageSize));
  if (search !== undefined) url.searchParams.set('search', search);

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const body: unknown = await response.json();
  return getUsersResponseSchema.parse(body);
}

export async function getUser(id: number): Promise<UserDetailDto> {
  const url = apiUrl(`/users/${id}`);

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return userDetailSchema.parse(body);
}

export async function updateUser(id: number, data: UpdateUserDto): Promise<MobileUserDto> {
  const url = apiUrl(`/users/${id}`);

  const response = await apiFetch(url, {
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
  const url = apiUrl(`/users/${id}`);

  const response = await apiFetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to deactivate user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return mobileUserSchema.parse(body);
}

export async function reactivateUser(id: number): Promise<MobileUserDto> {
  const url = apiUrl(`/users/${id}/reactivate`);

  const response = await apiFetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to reactivate user: ${response.status}`);
  }

  const body: unknown = await response.json();
  return mobileUserSchema.parse(body);
}
