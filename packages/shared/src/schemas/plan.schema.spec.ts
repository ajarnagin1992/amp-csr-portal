import { planSchema } from './plan.schema.js';

const validPlan = {
  id: 1,
  name: 'Unlimited Wash',
  price: 29.99,
  status: 'ACTIVE',
};

describe('planSchema', () => {
  it('accepts a valid plan', () => {
    expect(planSchema.safeParse(validPlan).success).toBe(true);
  });

  it('accepts a DISABLED plan', () => {
    expect(planSchema.safeParse({ ...validPlan, status: 'DISABLED' }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(planSchema.safeParse({ ...validPlan, status: 'ARCHIVED' }).success).toBe(false);
  });

  it('rejects a price that arrives as a string', () => {
    expect(planSchema.safeParse({ ...validPlan, price: '29.99' }).success).toBe(false);
  });

  it('accepts a zero price for a free plan', () => {
    expect(planSchema.safeParse({ ...validPlan, price: 0 }).success).toBe(true);
  });

  it('rejects a missing name', () => {
    const { name, ...rest } = validPlan;
    expect(planSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing id', () => {
    const { id, ...rest } = validPlan;
    expect(planSchema.safeParse(rest).success).toBe(false);
  });
});
