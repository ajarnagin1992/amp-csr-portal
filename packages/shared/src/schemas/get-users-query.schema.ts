import { z } from 'zod';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * What a client may send. Every field is optional because the server supplies
 * the pagination defaults; omitting one is not the same as sending a bad value.
 */
export const getUsersParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

export type GetUsersParamsDto = z.infer<typeof getUsersParamsSchema>;

/**
 * The same query once the server has resolved the pagination defaults. Each
 * field is taken from the params shape and only given a default, so the
 * validation rules live in one place and the two schemas cannot drift.
 */
export const getUsersQuerySchema = getUsersParamsSchema.extend({
  page: getUsersParamsSchema.shape.page.default(DEFAULT_PAGE),
  pageSize: getUsersParamsSchema.shape.pageSize.default(DEFAULT_PAGE_SIZE),
});

export type GetUsersQueryDto = z.infer<typeof getUsersQuerySchema>;

export type Getsomething = z.input<typeof getUsersQuerySchema>
