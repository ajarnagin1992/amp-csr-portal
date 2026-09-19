import { z } from 'zod';

// price is in cents, matching the plans table. New plans start ACTIVE.
export const createPlanSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
});

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
