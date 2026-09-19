import { subscriptionSchema } from './subscription.schema.js';

const validPlan = {
  id: 1,
  name: 'Unlimited Wash',
  description: 'Unlimited exterior washes',
  price: 29.99,
  status: 'ACTIVE',
};

const validSubscription = {
  id: 10,
  status: 'ACTIVE',
  nextBillingDate: '2026-02-01T00:00:00.000Z',
  plan: validPlan,
};

describe('subscriptionSchema', () => {
  it('accepts a valid subscription', () => {
    expect(subscriptionSchema.safeParse(validSubscription).success).toBe(true);
  });

  it.each(['ACTIVE', 'OVERDUE', 'CANCELLED', 'TRANSFERRED'])('accepts the %s status', (status) => {
    expect(subscriptionSchema.safeParse({ ...validSubscription, status }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(subscriptionSchema.safeParse({ ...validSubscription, status: 'PAUSED' }).success).toBe(false);
  });

  it('rejects a nextBillingDate that is not a datetime', () => {
    expect(subscriptionSchema.safeParse({ ...validSubscription, nextBillingDate: 'not-a-date' }).success).toBe(false);
  });

  it('rejects a date-only nextBillingDate', () => {
    expect(subscriptionSchema.safeParse({ ...validSubscription, nextBillingDate: '2026-02-01' }).success).toBe(false);
  });

  it('rejects a missing plan', () => {
    const { plan, ...rest } = validSubscription;
    expect(subscriptionSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a nested plan that is invalid', () => {
    const result = subscriptionSchema.safeParse({
      ...validSubscription,
      plan: { ...validPlan, status: 'ARCHIVED' },
    });
    expect(result.success).toBe(false);
  });
});
