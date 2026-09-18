import type { MobileUserDto, UserDetailDto } from '@amp-csr/shared';
import type { MobileUser } from '../../generated/prisma/client.js';
import { toVehicleDto, type VehicleWithCurrentSubscription } from './vehicle.mapper.js';
import { toPurchaseDto, type PurchaseWithVehicle } from './purchase.mapper.js';

export type MobileUserWithDetail = MobileUser & {
  vehicles: VehicleWithCurrentSubscription[];
  purchases: PurchaseWithVehicle[];
};

export function toMobileUserDto(user: MobileUser): MobileUserDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastUpdated: user.lastUpdated.toISOString(),
  };
}

export function toUserDetailDto(user: MobileUserWithDetail): UserDetailDto {
  return {
    // Safe to spread a DTO: its type is the contract, so it cannot carry extra columns.
    ...toMobileUserDto(user),
    vehicles: user.vehicles.map(toVehicleDto),
    purchases: user.purchases.map(toPurchaseDto),
  };
}
