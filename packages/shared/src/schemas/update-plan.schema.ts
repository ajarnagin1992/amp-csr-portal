import { z } from 'zod';

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    price: z.number().int().nonnegative().optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
