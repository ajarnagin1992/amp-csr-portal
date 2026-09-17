import { updateSubscriptionSchema } from './update-subscription.schema.js';

describe('updateSubscriptionSchema', () => {
  it('accepts a status-only update', () => {
    expect(updateSubscriptionSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true);
  });

  it('accepts a transferVehicleId-only update', () => {
    expect(updateSubscriptionSchema.safeParse({ transferVehicleId: 5 }).success).toBe(true);
  });

  it('rejects a status value other than CANCELLED', () => {
    expect(updateSubscriptionSchema.safeParse({ status: 'ACTIVE' }).success).toBe(false);
  });

  it('rejects an empty body', () => {
    expect(updateSubscriptionSchema.safeParse({}).success).toBe(false);
  });

  it('rejects providing both status and transferVehicleId', () => {
    expect(updateSubscriptionSchema.safeParse({ status: 'CANCELLED', transferVehicleId: 5 }).success).toBe(false);
  });
});
