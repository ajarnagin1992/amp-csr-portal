import { purchaseSchema, type PurchaseDto } from '@amp-csr/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export type PurchaseWithVehicle = Prisma.PurchaseGetPayload<{
  include: { vehicle: { select: { id: true; licensePlate: true } } };
}>;

export function toPurchaseDto(purchase: PurchaseWithVehicle): PurchaseDto {
  return purchaseSchema.parse({
    ...purchase,
    createdAt: purchase.createdAt.toISOString(),
  });
}
