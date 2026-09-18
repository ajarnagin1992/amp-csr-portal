import { z } from 'zod';
import { subscriptionSchema } from './subscription.schema.js';


export const vehicleSchema = z.object({
  id: z.number(),
  licensePlate: z.string(),
  state: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  subscription: subscriptionSchema.optional(),
});

export type VehicleDto = z.infer<typeof vehicleSchema>;
