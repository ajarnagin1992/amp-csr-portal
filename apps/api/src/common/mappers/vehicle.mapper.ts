import type { VehicleDto } from '@amp-csr/shared';
import type { Vehicle } from '../../generated/prisma/client.js';
import { toSubscriptionDto, type SubscriptionWithPlan } from './subscription.mapper.js';

// A vehicle carries at most its single current subscription, not the full history.
export type VehicleWithCurrentSubscription = Vehicle & { subscription?: SubscriptionWithPlan };

export function toVehicleDto(vehicle: VehicleWithCurrentSubscription): VehicleDto {
  return {
    id: vehicle.id,
    licensePlate: vehicle.licensePlate,
    state: vehicle.state,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    subscription: vehicle.subscription ? toSubscriptionDto(vehicle.subscription) : undefined,
  };
}
