import type { MobileUserDto, PlanDto, PurchaseDto, SubscriptionDto, VehicleDto } from '@amp-csr/shared'

export type VehicleRecord = Omit<VehicleDto, 'subscription'> & { mobileUserId: number }

export type SubscriptionRecord = Omit<SubscriptionDto, 'plan'> & {
  vehicleId: number
  planId: number
  // Insertion order: a vehicle's current subscription is its newest one, as in the API.
  seq: number
}

export type PurchaseRecord = PurchaseDto & { mobileUserId: number }

export interface Store {
  users: MobileUserDto[]
  vehicles: VehicleRecord[]
  subscriptions: SubscriptionRecord[]
  purchases: PurchaseRecord[]
  plans: PlanDto[]
}

const SEEDED_AT = '2026-01-01T00:00:00.000Z'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A small, deterministic world. Every named customer exists to exercise one situation:
 *
 * | id | customer      | situation                                                          |
 * |----|---------------|--------------------------------------------------------------------|
 * | 1  | Jane Doe      | 3 vehicles: ACTIVE sub, no sub, ACTIVE sub. Transfer has 1 target  |
 * | 2  | Marcus Lee    | OVERDUE subscription and a failed payment                          |
 * | 3  | Priya Patel   | DISABLED account with a CANCELLED subscription                     |
 * | 4  | Sam Rivera    | one vehicle, ACTIVE sub. Nowhere to transfer to                    |
 * | 5  | Nora Kim      | no vehicles, no purchases                                          |
 * | 6+ | Member N06…   | filler, so the list spans several pages (45 customers in all)      |
 */
export function createSeed(): Store {
  const named: Array<[string, string, string, MobileUserDto['status']]> = [
    ['Jane', 'Doe', '555-0100', 'ACTIVE'],
    ['Marcus', 'Lee', '555-0101', 'ACTIVE'],
    ['Priya', 'Patel', '555-0102', 'DISABLED'],
    ['Sam', 'Rivera', '555-0103', 'ACTIVE'],
    ['Nora', 'Kim', '555-0104', 'ACTIVE'],
  ]

  const users: MobileUserDto[] = named.map(([firstName, lastName, phone, status], index) => ({
    id: index + 1,
    firstName,
    lastName,
    email: `${firstName}.${lastName}@example.com`.toLowerCase(),
    phone,
    status,
    createdAt: SEEDED_AT,
    lastUpdated: SEEDED_AT,
  }))

  for (let id = named.length + 1; id <= 45; id++) {
    users.push({
      id,
      firstName: 'Member',
      lastName: `N${pad(id)}`,
      email: `member${pad(id)}@example.org`,
      phone: `555-2${String(id).padStart(3, '0')}`,
      status: 'ACTIVE',
      createdAt: SEEDED_AT,
      lastUpdated: SEEDED_AT,
    })
  }

  const plans: PlanDto[] = [
    { id: 1, name: 'Unlimited Monthly', description: 'Unlimited exterior washes', price: 2999, status: 'ACTIVE' },
    { id: 2, name: 'Basic Wash', description: 'One exterior wash a week', price: 1499, status: 'ACTIVE' },
    { id: 3, name: 'Premium Plus', description: '', price: 4999, status: 'ACTIVE' },
    { id: 4, name: 'Legacy Wash Plan', description: 'Closed to new members', price: 1500, status: 'DISABLED' },
  ]

  const vehicles: VehicleRecord[] = [
    { id: 1, mobileUserId: 1, licensePlate: 'ABC123', state: 'CA', make: 'Toyota', model: 'Corolla', year: 2020 },
    { id: 2, mobileUserId: 1, licensePlate: 'XYZ789', state: 'NV', make: 'Honda', model: 'Civic', year: 2019 },
    { id: 3, mobileUserId: 1, licensePlate: 'JAN555', state: 'CA', make: 'Mazda', model: 'Mazda3', year: 2018 },
    { id: 4, mobileUserId: 2, licensePlate: 'LEE456', state: 'TX', make: 'Ford', model: 'F-150', year: 2022 },
    { id: 5, mobileUserId: 3, licensePlate: 'PRI321', state: 'WA', make: 'Subaru', model: 'Outback', year: 2021 },
    { id: 6, mobileUserId: 4, licensePlate: 'SAM007', state: 'OR', make: 'Tesla', model: 'Model 3', year: 2023 },
  ]

  const subscriptions: SubscriptionRecord[] = [
    { id: 1, seq: 1, vehicleId: 1, planId: 1, status: 'ACTIVE', nextBillingDate: '2026-10-01T00:00:00.000Z' },
    { id: 2, seq: 2, vehicleId: 3, planId: 3, status: 'ACTIVE', nextBillingDate: '2026-10-05T00:00:00.000Z' },
    { id: 3, seq: 3, vehicleId: 4, planId: 2, status: 'OVERDUE', nextBillingDate: '2026-09-10T00:00:00.000Z' },
    { id: 4, seq: 4, vehicleId: 5, planId: 3, status: 'CANCELLED', nextBillingDate: '2026-09-20T00:00:00.000Z' },
    { id: 5, seq: 5, vehicleId: 6, planId: 1, status: 'ACTIVE', nextBillingDate: '2026-10-12T00:00:00.000Z' },
  ]

  const purchases: PurchaseRecord[] = [
    {
      id: 1,
      mobileUserId: 1,
      type: 'SUBSCRIPTION',
      status: 'SUCCESS',
      amount: 2999,
      description: 'Unlimited Monthly',
      createdAt: '2026-09-01T00:00:00.000Z',
      subscriptionId: 1,
      vehicle: { id: 1, licensePlate: 'ABC123' },
    },
    {
      id: 2,
      mobileUserId: 1,
      type: 'SINGLE_WASH',
      status: 'SUCCESS',
      amount: 1500,
      description: 'Single wash',
      createdAt: '2026-08-15T00:00:00.000Z',
      subscriptionId: undefined,
      vehicle: { id: 2, licensePlate: 'XYZ789' },
    },
    {
      id: 3,
      mobileUserId: 2,
      type: 'SUBSCRIPTION',
      status: 'FAILURE',
      amount: 1499,
      description: 'Basic Wash',
      createdAt: '2026-09-10T00:00:00.000Z',
      subscriptionId: 3,
      vehicle: { id: 4, licensePlate: 'LEE456' },
    },
  ]

  return { users, vehicles, subscriptions, purchases, plans }
}
