import type { PurchaseDto } from '@amp-csr/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export type PurchaseWithVehicle = Prisma.PurchaseGetPayload<{
  include: { vehicle: { select: { id: true; licensePlate: true } } };
}>;

export function toPurchaseDto(purchase: PurchaseWithVehicle): PurchaseDto {
  return {
    id: purchase.id,
    type: purchase.type,
    status: purchase.status,
    amount: purchase.amount,
    description: purchase.description,
    createdAt: purchase.createdAt.toISOString(),
    // A one-off wash has no subscription, which Prisma stores as null and the contract states as undefined.
    subscriptionId: purchase.subscriptionId ?? undefined,
    vehicle: {
      id: purchase.vehicle.id,
      licensePlate: purchase.vehicle.licensePlate,
    },
  };
}
