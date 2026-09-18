import { updateUserSchema } from './update-user.schema.js';

describe('updateUserSchema', () => {
  it('accepts a partial update with just one field', () => {
    expect(updateUserSchema.safeParse({ firstName: 'Jane' }).success).toBe(true);
  });

  it('accepts all editable fields at once', () => {
    const result = updateUserSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '555-1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format', () => {
    expect(updateUserSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an empty first name', () => {
    expect(updateUserSchema.safeParse({ firstName: '' }).success).toBe(false);
  });

  it('rejects an empty body with no fields provided', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a status field, which is no longer part of a profile update', () => {
    const result = updateUserSchema.safeParse({ firstName: 'Jane', status: 'DISABLED' });
    expect(result.success && Object.keys(result.data).includes('status')).toBe(false);
  });
});
