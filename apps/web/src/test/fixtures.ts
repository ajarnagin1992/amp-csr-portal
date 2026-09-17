import type {
  ListUsersResponseDto,
  MobileUserDto,
  PurchaseDto,
  SubscriptionDto,
  UserDetailDto,
  VehicleDto,
} from "@amp-csr/shared";

export const validUser: MobileUserDto = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

// total exceeds the default pageSize (20), so this response spans multiple pages
export const pagedUsersResponse: ListUsersResponseDto = {
  data: [validUser],
  total: 45,
};

export const validSubscription: SubscriptionDto = {
  id: 1,
  status: 'ACTIVE',
  nextBillingDate: '2026-02-01T00:00:00.000Z',
  plan: {
    id: 1,
    name: 'Unlimited Monthly',
    price: 2999,
    status: 'ACTIVE',
  },
};

export const validVehicle: VehicleDto = {
  id: 1,
  licensePlate: 'ABC123',
  state: 'CA',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  subscription: validSubscription,
};

export const validPurchase: PurchaseDto = {
  id: 1,
  type: 'SINGLE_WASH',
  status: 'SUCCESS',
  amount: 1500,
  description: 'Single wash',
  createdAt: '2026-01-15T00:00:00.000Z',
  subscriptionId: null,
  vehicle: { id: validVehicle.id, licensePlate: validVehicle.licensePlate },
};

export const validUserDetail: UserDetailDto = {
  ...validUser,
  vehicles: [validVehicle],
  purchases: [validPurchase],
};
