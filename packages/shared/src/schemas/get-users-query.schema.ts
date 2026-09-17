import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(20),
  search: z.string().optional(),
});

export type GetUsersQueryDto = z.infer<typeof getUsersQuerySchema>;
