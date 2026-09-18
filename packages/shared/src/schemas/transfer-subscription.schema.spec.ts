import { transferSubscriptionSchema } from './transfer-subscription.schema.js';

describe('transferSubscriptionSchema', () => {
  it('accepts a valid vehicleId', () => {
    expect(transferSubscriptionSchema.safeParse({ vehicleId: 20 }).success).toBe(true);
  });

  it('rejects a missing vehicleId', () => {
    expect(transferSubscriptionSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-number vehicleId', () => {
    expect(transferSubscriptionSchema.safeParse({ vehicleId: '20' }).success).toBe(false);
  });
});
