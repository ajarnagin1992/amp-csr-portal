import { z } from 'zod';

export const updateSubscriptionSchema = z
  .object({
    status: z.literal('CANCELLED').optional(),
    transferVehicleId: z.number().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
  .refine((data) => !(data.status !== undefined && data.transferVehicleId !== undefined), {
    message: 'Cannot cancel and transfer in the same request',
  });

export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
