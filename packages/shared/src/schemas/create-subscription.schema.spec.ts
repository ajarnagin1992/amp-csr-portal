import { createSubscriptionSchema } from './create-subscription.schema.js';

describe('createSubscriptionSchema', () => {
  it('accepts a valid vehicleId and planId', () => {
    expect(createSubscriptionSchema.safeParse({ vehicleId: 1, planId: 2 }).success).toBe(true);
  });

  it('rejects a missing vehicleId', () => {
    expect(createSubscriptionSchema.safeParse({ planId: 2 }).success).toBe(false);
  });

  it('rejects a missing planId', () => {
    expect(createSubscriptionSchema.safeParse({ vehicleId: 1 }).success).toBe(false);
  });

  it('rejects a non-number vehicleId', () => {
    expect(createSubscriptionSchema.safeParse({ vehicleId: '1', planId: 2 }).success).toBe(false);
  });
});
