import { vehicleSchema, type VehicleDto } from '@amp-csr/shared';
import type { Vehicle } from '../../generated/prisma/client.js';
import { toSubscriptionDto, type SubscriptionWithPlan } from './subscription.mapper.js';

// A vehicle carries at most its single current subscription, not the full history.
export type VehicleWithCurrentSubscription = Vehicle & { subscription?: SubscriptionWithPlan };

export function toVehicleDto(vehicle: VehicleWithCurrentSubscription): VehicleDto {
  return vehicleSchema.parse({
    ...vehicle,
    subscription: vehicle.subscription ? toSubscriptionDto(vehicle.subscription) : undefined,
  });
}
