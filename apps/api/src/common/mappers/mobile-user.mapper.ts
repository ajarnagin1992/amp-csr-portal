import { mobileUserSchema, type MobileUserDto, type UserDetailDto } from '@amp-csr/shared';
import type { MobileUser } from '../../generated/prisma/client.js';
import { toVehicleDto, type VehicleWithCurrentSubscription } from './vehicle.mapper.js';
import { toPurchaseDto, type PurchaseWithVehicle } from './purchase.mapper.js';

export type MobileUserWithDetail = MobileUser & {
  vehicles: VehicleWithCurrentSubscription[];
  purchases: PurchaseWithVehicle[];
};

export function toMobileUserDto(user: MobileUser): MobileUserDto {
  return mobileUserSchema.parse({
    ...user,
    createdAt: user.createdAt.toISOString(),
    lastUpdated: user.lastUpdated.toISOString(),
  });
}

// Each part is validated by its own mapper, so the composed detail needs no second parse.
export function toUserDetailDto(user: MobileUserWithDetail): UserDetailDto {
  return {
    ...toMobileUserDto(user),
    vehicles: user.vehicles.map(toVehicleDto),
    purchases: user.purchases.map(toPurchaseDto),
  };
}
