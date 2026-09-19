import type {
  MobileUserDto,
  PlanDto,
  PurchaseDto,
  SubscriptionDto,
  UserDetailDto,
  VehicleDto,
} from '@amp-csr/shared';
import type { MobileUser, Plan, Vehicle } from '../generated/prisma/client.js';
import type { MobileUserWithDetail } from '../common/mappers/mobile-user.mapper.js';
import type { PurchaseWithVehicle } from '../common/mappers/purchase.mapper.js';
import type { SubscriptionWithPlan } from '../common/mappers/subscription.mapper.js';
import type { VehicleWithCurrentSubscription } from '../common/mappers/vehicle.mapper.js';

// Each `*Row` is what Prisma hands the service; each `*Dto` is the contract the
// service is required to put on the wire for it.

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

export const planRow: Plan = {
  id: 1,
  name: 'Unlimited Monthly',
  description: 'Unlimited exterior washes',
  price: 2999,
  status: 'ACTIVE',
  createdAt: CREATED_AT,
  lastUpdated: CREATED_AT,
};

export const planDto: PlanDto = {
  id: 1,
  name: 'Unlimited Monthly',
  description: 'Unlimited exterior washes',
  price: 2999,
  status: 'ACTIVE',
};

export const subscriptionRow: SubscriptionWithPlan = {
  id: 1,
  vehicleId: 1,
  planId: planRow.id,
  status: 'ACTIVE',
  nextBillingDate: new Date('2026-02-01T00:00:00.000Z'),
  createdAt: CREATED_AT,
  lastUpdated: CREATED_AT,
  plan: planRow,
};

export const subscriptionDto: SubscriptionDto = {
  id: 1,
  status: 'ACTIVE',
  nextBillingDate: '2026-02-01T00:00:00.000Z',
  plan: planDto,
};

export const vehicleRow: Vehicle = {
  id: 1,
  mobileUserId: 1,
  licensePlate: 'ABC123',
  state: 'CA',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  createdAt: CREATED_AT,
};

export const vehicleWithSubscriptionRow: VehicleWithCurrentSubscription = {
  ...vehicleRow,
  subscription: subscriptionRow,
};

export const vehicleDto: VehicleDto = {
  id: 1,
  licensePlate: 'ABC123',
  state: 'CA',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  subscription: subscriptionDto,
};

export const purchaseRow: PurchaseWithVehicle = {
  id: 1,
  mobileUserId: 1,
  vehicleId: vehicleRow.id,
  // oxlint-disable-next-line unicorn/no-null -- Prisma returns null for a nullable column
  subscriptionId: null,
  type: 'SINGLE_WASH',
  status: 'SUCCESS',
  amount: 1500,
  description: 'Single wash',
  createdAt: new Date('2026-01-15T00:00:00.000Z'),
  vehicle: { id: vehicleRow.id, licensePlate: vehicleRow.licensePlate },
};

export const purchaseDto: PurchaseDto = {
  id: 1,
  type: 'SINGLE_WASH',
  status: 'SUCCESS',
  amount: 1500,
  description: 'Single wash',
  createdAt: '2026-01-15T00:00:00.000Z',
  subscriptionId: undefined,
  vehicle: { id: vehicleRow.id, licensePlate: vehicleRow.licensePlate },
};

export const userRow: MobileUser = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: CREATED_AT,
  lastUpdated: CREATED_AT,
};

export const userDto: MobileUserDto = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

// What the detail query itself returns: every vehicle carries its subscription
// history as an array, which the service narrows to the current one.
export const userDetailQueryRow = {
  ...userRow,
  vehicles: [{ ...vehicleRow, subscriptions: [subscriptionRow] }],
};

export const userDetailRow: MobileUserWithDetail = {
  ...userRow,
  vehicles: [vehicleWithSubscriptionRow],
  purchases: [purchaseRow],
};

export const userDetailDto: UserDetailDto = {
  ...userDto,
  vehicles: [vehicleDto],
  purchases: [purchaseDto],
};
