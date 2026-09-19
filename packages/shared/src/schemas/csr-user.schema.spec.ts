import { csrUserSchema } from './csr-user.schema.js';

describe('csrUserSchema', () => {
  it('accepts a CSR user', () => {
    expect(csrUserSchema.safeParse({ id: 1, username: 'csr', email: 'csr@example.com' }).success).toBe(true);
  });

  it('strips a password hash rather than passing it through', () => {
    const parsed = csrUserSchema.parse({ id: 1, username: 'csr', email: 'csr@example.com', passwordHash: 'x' });
    expect(parsed).not.toHaveProperty('passwordHash');
  });

  it('rejects a missing email', () => {
    expect(csrUserSchema.safeParse({ id: 1, username: 'csr' }).success).toBe(false);
  });
});
