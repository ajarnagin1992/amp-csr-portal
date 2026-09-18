import { mobileUserSchema } from './mobile-user.schema.js';

const validUser = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

describe('mobileUserSchema', () => {
  it('accepts a valid mobile user', () => {
    expect(mobileUserSchema.safeParse(validUser).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(mobileUserSchema.safeParse({ ...validUser, status: 'PENDING' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(mobileUserSchema.safeParse({ ...validUser, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    const { id, ...rest } = validUser;
    expect(mobileUserSchema.safeParse(rest).success).toBe(false);
  });
});
