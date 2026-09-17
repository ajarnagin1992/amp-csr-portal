import { z } from 'zod';
import { mobileUserSchema } from './mobile-user.schema.js';

export const vehicleSchema = z.object({
  id: z.number(),
  licensePlate: z.string(),
  state: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
});

export type VehicleDto = z.infer<typeof vehicleSchema>;

export const userDetailSchema = mobileUserSchema.extend({
  vehicles: z.array(vehicleSchema),
});

export type UserDetailDto = z.infer<typeof userDetailSchema>;
