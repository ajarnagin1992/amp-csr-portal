import { z } from 'zod';

export const transferSubscriptionSchema = z.object({
  vehicleId: z.number(),
});

export type TransferSubscriptionDto = z.infer<typeof transferSubscriptionSchema>;
