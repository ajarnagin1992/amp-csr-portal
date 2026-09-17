import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  vehicleId: z.number(),
  planId: z.number(),
});

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
