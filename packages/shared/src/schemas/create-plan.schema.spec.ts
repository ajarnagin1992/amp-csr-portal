import { createPlanSchema } from './create-plan.schema.js';

describe('createPlanSchema', () => {
  it('accepts a name and a price', () => {
    expect(createPlanSchema.safeParse({ name: 'Basic Wash', price: 900 }).success).toBe(true);
  });

  it('accepts an optional description', () => {
    expect(createPlanSchema.safeParse({ name: 'Basic Wash', price: 900, description: 'One wash a day' }).success).toBe(
      true,
    );
  });

  it('accepts a zero price for a free plan', () => {
    expect(createPlanSchema.safeParse({ name: 'Trial', price: 0 }).success).toBe(true);
  });

  it('trims the name', () => {
    const result = createPlanSchema.safeParse({ name: '  Basic Wash  ', price: 900 });
    expect(result.success && result.data.name).toBe('Basic Wash');
  });

  it('rejects a missing name', () => {
    expect(createPlanSchema.safeParse({ price: 900 }).success).toBe(false);
  });

  it('rejects a blank name', () => {
    expect(createPlanSchema.safeParse({ name: '   ', price: 900 }).success).toBe(false);
  });

  it('rejects a missing price', () => {
    expect(createPlanSchema.safeParse({ name: 'Basic Wash' }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(createPlanSchema.safeParse({ name: 'Basic Wash', price: -1 }).success).toBe(false);
  });

  it('rejects a fractional price, since prices are whole cents', () => {
    expect(createPlanSchema.safeParse({ name: 'Basic Wash', price: 9.99 }).success).toBe(false);
  });
});
