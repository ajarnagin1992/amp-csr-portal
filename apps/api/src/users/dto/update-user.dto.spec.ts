import { updateUserSchema } from './update-user.dto.js';

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
      status: 'DISABLED',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format', () => {
    expect(updateUserSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an empty first name', () => {
    expect(updateUserSchema.safeParse({ firstName: '' }).success).toBe(false);
  });

  it('rejects a status value outside ACTIVE/DISABLED', () => {
    expect(updateUserSchema.safeParse({ status: 'DELETED' }).success).toBe(false);
  });

  it('rejects an empty body with no fields provided', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });
});
