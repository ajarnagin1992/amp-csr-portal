import { vehicleSchema } from './vehicle.schema.js';

const validSubscription = {
  id: 10,
  status: 'ACTIVE',
  nextBillingDate: '2026-02-01T00:00:00.000Z',
  plan: {
    id: 1,
    name: 'Unlimited Wash',
    description: 'Unlimited exterior washes',
    price: 29.99,
    status: 'ACTIVE',
  },
};

const validVehicle = {
  id: 5,
  licensePlate: 'ABC1234',
  state: 'TX',
  make: 'Toyota',
  model: 'Corolla',
  year: 2022,
  subscription: validSubscription,
};

describe('vehicleSchema', () => {
  it('accepts a valid vehicle with a subscription', () => {
    expect(vehicleSchema.safeParse(validVehicle).success).toBe(true);
  });

  it('accepts a vehicle with no subscription', () => {
    const { subscription, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects a null subscription, which is not the same as an omitted one', () => {
    expect(vehicleSchema.safeParse({ ...validVehicle, subscription: null }).success).toBe(false);
  });

  it('rejects a nested subscription that is invalid', () => {
    const result = vehicleSchema.safeParse({
      ...validVehicle,
      subscription: { ...validSubscription, status: 'PAUSED' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a year that arrives as a string', () => {
    expect(vehicleSchema.safeParse({ ...validVehicle, year: '2022' }).success).toBe(false);
  });

  it('rejects a missing licensePlate', () => {
    const { licensePlate, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing state', () => {
    const { state, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing id', () => {
    const { id, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(false);
  });
});
