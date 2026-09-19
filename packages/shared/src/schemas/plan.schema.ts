import { z } from 'zod';


export const planSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export type PlanDto = z.infer<typeof planSchema>;
