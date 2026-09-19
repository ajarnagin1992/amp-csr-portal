import { z } from 'zod';

export const getPlansRequestSchema = z.object({
  includeDisabled: z.boolean().optional(),
});

export type GetPlansRequestDto = z.infer<typeof getPlansRequestSchema>;

// Query-string flavour of the request: `?includeDisabled=true`. Anything but "true" means active plans only.
export const getPlansQuerySchema = z.object({
  includeDisabled: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type GetPlansQueryDto = z.infer<typeof getPlansQuerySchema>;
