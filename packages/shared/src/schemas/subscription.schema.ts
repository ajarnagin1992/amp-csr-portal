import { z } from 'zod';
import { planSchema } from './plan.schema.js';


export const subscriptionSchema = z.object({
  id: z.number(),
  status: z.enum(['ACTIVE', 'OVERDUE', 'CANCELLED', 'TRANSFERRED']),
  nextBillingDate: z.iso.datetime(),
  plan: planSchema,
});

export type SubscriptionDto = z.infer<typeof subscriptionSchema>;
