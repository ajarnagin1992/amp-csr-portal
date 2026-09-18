import { z } from 'zod';


export const purchaseSchema = z.object({
  id: z.number(),
  type: z.enum(['SUBSCRIPTION', 'SINGLE_WASH']),
  status: z.enum(['SUCCESS', 'FAILURE', 'REFUNDED']),
  amount: z.number(),
  description: z.string(),
  createdAt: z.iso.datetime(),
  subscriptionId: z
    .number()
    .nullish()
    .transform((value) => value ?? undefined),
  vehicle: z.object({
    id: z.number(),
    licensePlate: z.string(),
  }),
});

export type PurchaseDto = z.infer<typeof purchaseSchema>;
