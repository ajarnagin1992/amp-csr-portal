import { z } from 'zod';
import { mobileUserSchema } from './mobile-user.schema.js';

export const planSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export type PlanDto = z.infer<typeof planSchema>;

export const subscriptionSchema = z.object({
  id: z.number(),
  status: z.enum(['ACTIVE', 'OVERDUE', 'CANCELLED', 'TRANSFERRED']),
  nextBillingDate: z.iso.datetime(),
  plan: planSchema,
});

export type SubscriptionDto = z.infer<typeof subscriptionSchema>;

export const purchaseSchema = z.object({
  id: z.number(),
  type: z.enum(['SUBSCRIPTION', 'SINGLE_WASH']),
  status: z.enum(['SUCCESS', 'FAILURE', 'REFUNDED']),
  amount: z.number(),
  description: z.string(),
  createdAt: z.iso.datetime(),
  subscriptionId: z.number().nullable(),
  vehicle: z.object({
    id: z.number(),
    licensePlate: z.string(),
  }),
});

export type PurchaseDto = z.infer<typeof purchaseSchema>;

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

export const userDetailSchema = mobileUserSchema.extend({
  vehicles: z.array(vehicleSchema),
  purchases: z.array(purchaseSchema),
});

export type UserDetailDto = z.infer<typeof userDetailSchema>;
