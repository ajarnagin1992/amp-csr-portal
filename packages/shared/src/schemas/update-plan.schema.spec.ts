import { updatePlanSchema } from './update-plan.schema.js';

describe('updatePlanSchema', () => {
  it('accepts a partial update with just one field', () => {
    expect(updatePlanSchema.safeParse({ price: 1200 }).success).toBe(true);
  });

  it('accepts all editable fields at once', () => {
    const result = updatePlanSchema.safeParse({
      name: 'Premium Wash',
      description: 'Includes wax',
      price: 1900,
      status: 'DISABLED',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a status change on its own', () => {
    expect(updatePlanSchema.safeParse({ status: 'ACTIVE' }).success).toBe(true);
  });

  it('accepts clearing the description', () => {
    expect(updatePlanSchema.safeParse({ description: '' }).success).toBe(true);
  });

  it('rejects an empty body with no fields provided', () => {
    expect(updatePlanSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a blank name', () => {
    expect(updatePlanSchema.safeParse({ name: '  ' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(updatePlanSchema.safeParse({ status: 'ARCHIVED' }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(updatePlanSchema.safeParse({ price: -100 }).success).toBe(false);
  });

  it('rejects a fractional price, since prices are whole cents', () => {
    expect(updatePlanSchema.safeParse({ price: 19.99 }).success).toBe(false);
  });
});
