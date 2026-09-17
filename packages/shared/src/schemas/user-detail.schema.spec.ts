import { purchaseSchema, subscriptionSchema, userDetailSchema, vehicleSchema } from './user-detail.schema.js';

const validPlan = {
  id: 1,
  name: 'Unlimited Monthly',
  price: 2999,
  status: 'ACTIVE',
};

const validSubscription = {
  id: 1,
  status: 'ACTIVE',
  nextBillingDate: '2026-02-01T00:00:00.000Z',
  plan: validPlan,
};

const validVehicle = {
  id: 1,
  licensePlate: 'ABC123',
  state: 'CA',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
};

const validPurchase = {
  id: 1,
  type: 'SINGLE_WASH',
  status: 'SUCCESS',
  amount: 1500,
  description: 'Single wash',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const validUserDetail = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
  vehicles: [validVehicle],
  purchases: [validPurchase],
};

describe('subscriptionSchema', () => {
  it('accepts a valid subscription', () => {
    expect(subscriptionSchema.safeParse(validSubscription).success).toBe(true);
  });

  it('rejects a missing plan', () => {
    const { plan, ...rest } = validSubscription;
    expect(subscriptionSchema.safeParse(rest).success).toBe(false);
  });
});

describe('vehicleSchema', () => {
  it('accepts a valid vehicle', () => {
    expect(vehicleSchema.safeParse(validVehicle).success).toBe(true);
  });

  it('rejects a missing license plate', () => {
    const { licensePlate, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts a vehicle with an active subscription', () => {
    expect(vehicleSchema.safeParse({ ...validVehicle, subscription: validSubscription }).success).toBe(true);
  });

  it('accepts a vehicle with no subscription', () => {
    expect(vehicleSchema.safeParse(validVehicle).success).toBe(true);
  });
});

describe('purchaseSchema', () => {
  it('accepts a valid purchase', () => {
    expect(purchaseSchema.safeParse(validPurchase).success).toBe(true);
  });

  it('rejects a missing amount', () => {
    const { amount, ...rest } = validPurchase;
    expect(purchaseSchema.safeParse(rest).success).toBe(false);
  });
});

describe('userDetailSchema', () => {
  it('accepts a valid user detail with vehicles and purchases', () => {
    expect(userDetailSchema.safeParse(validUserDetail).success).toBe(true);
  });

  it('accepts a user with no vehicles', () => {
    expect(userDetailSchema.safeParse({ ...validUserDetail, vehicles: [] }).success).toBe(true);
  });

  it('accepts a user with no purchases', () => {
    expect(userDetailSchema.safeParse({ ...validUserDetail, purchases: [] }).success).toBe(true);
  });

  it('rejects an invalid vehicle in the vehicles array', () => {
    const { licensePlate, ...invalidVehicle } = validVehicle;
    expect(userDetailSchema.safeParse({ ...validUserDetail, vehicles: [invalidVehicle] }).success).toBe(false);
  });

  it('rejects a missing vehicles field', () => {
    const { vehicles, ...rest } = validUserDetail;
    expect(userDetailSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing purchases field', () => {
    const { purchases, ...rest } = validUserDetail;
    expect(userDetailSchema.safeParse(rest).success).toBe(false);
  });
});
