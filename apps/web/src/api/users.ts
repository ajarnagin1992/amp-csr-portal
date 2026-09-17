import type { z } from 'zod';
import {
  getUsersQuerySchema,
  listUsersResponseSchema,
  mobileUserSchema,
  userDetailSchema,
  type ListUsersResponseDto,
  type MobileUserDto,
  type UpdateUserDto,
  type UserDetailDto,
} from '@amp-csr/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type GetUsersParams = Partial<z.output<typeof getUsersQuerySchema>>;

export async function getUsers(params: GetUsersParams = {}): Promise<ListUsersResponseDto> {
  const { page, pageSize, search } = params;
  const url = new URL('/users', API_BASE_URL);
  if (page !== undefined) url.searchParams.set('page', String(page));
  if (pageSize !== undefined) url.searchParams.set('pageSize', String(pageSize));
  if (search !== undefined) url.searchParams.set('search', search);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const body = await response.json();
  return listUsersResponseSchema.parse(body);
}

export async function getUser(id: number): Promise<UserDetailDto> {
  const url = new URL(`/users/${id}`, API_BASE_URL);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const body = await response.json();
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

  const body = await response.json();
  return mobileUserSchema.parse(body);
}
