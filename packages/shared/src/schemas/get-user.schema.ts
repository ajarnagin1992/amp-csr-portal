import { z } from 'zod';
import { mobileUserSchema } from './mobile-user.schema.js';
import { purchaseSchema } from './purchase.schema.js';
import { vehicleSchema } from './vehicle.schema.js';

export const userDetailSchema = mobileUserSchema.extend({
  vehicles: z.array(vehicleSchema),
  purchases: z.array(purchaseSchema),
});

export type UserDetailDto = z.infer<typeof userDetailSchema>;
