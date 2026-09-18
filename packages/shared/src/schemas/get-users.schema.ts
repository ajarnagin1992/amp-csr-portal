import { z } from 'zod';
import { mobileUserSchema } from './mobile-user.schema.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export const getUsersRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

export type GetUsersRequestDto = z.infer<typeof getUsersRequestSchema>;

export const getUsersQuerySchema = getUsersRequestSchema.extend({
  page: getUsersRequestSchema.shape.page.default(DEFAULT_PAGE),
  pageSize: getUsersRequestSchema.shape.pageSize.default(DEFAULT_PAGE_SIZE),
});

export type GetUsersQueryDto = z.infer<typeof getUsersQuerySchema>;

export const getUsersResponseSchema = z.object({
  data: z.array(mobileUserSchema),
  total: z.number().int().nonnegative(),
});

export type ListUsersResponseDto = z.infer<typeof getUsersResponseSchema>;