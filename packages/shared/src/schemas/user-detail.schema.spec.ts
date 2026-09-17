import { userDetailSchema, vehicleSchema } from './user-detail.schema.js';

const validVehicle = {
  id: 1,
  licensePlate: 'ABC123',
  state: 'CA',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
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
};

describe('vehicleSchema', () => {
  it('accepts a valid vehicle', () => {
    expect(vehicleSchema.safeParse(validVehicle).success).toBe(true);
  });

  it('rejects a missing license plate', () => {
    const { licensePlate, ...rest } = validVehicle;
    expect(vehicleSchema.safeParse(rest).success).toBe(false);
  });
});

describe('userDetailSchema', () => {
  it('accepts a valid user detail with vehicles', () => {
    expect(userDetailSchema.safeParse(validUserDetail).success).toBe(true);
  });

  it('accepts a user with no vehicles', () => {
    expect(userDetailSchema.safeParse({ ...validUserDetail, vehicles: [] }).success).toBe(true);
  });

  it('rejects an invalid vehicle in the vehicles array', () => {
    const { licensePlate, ...invalidVehicle } = validVehicle;
    expect(userDetailSchema.safeParse({ ...validUserDetail, vehicles: [invalidVehicle] }).success).toBe(false);
  });

  it('rejects a missing vehicles field', () => {
    const { vehicles, ...rest } = validUserDetail;
    expect(userDetailSchema.safeParse(rest).success).toBe(false);
  });
});
