import { loginSchema } from './login.schema.js';

describe('loginSchema', () => {
  it('accepts an email and password', () => {
    expect(loginSchema.safeParse({ email: 'csr@example.com', password: 'hunter2' }).success).toBe(true);
  });

  it('trims and lowercases the email so lookups are case-insensitive', () => {
    const parsed = loginSchema.parse({ email: '  CSR@Example.com ', password: 'hunter2' });
    expect(parsed.email).toBe('csr@example.com');
  });

  it('leaves the password untouched', () => {
    const parsed = loginSchema.parse({ email: 'csr@example.com', password: '  Spaces And CASE  ' });
    expect(parsed.password).toBe('  Spaces And CASE  ');
  });

  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'hunter2' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'csr@example.com', password: '' }).success).toBe(false);
  });

  it('rejects an oversized password', () => {
    expect(loginSchema.safeParse({ email: 'csr@example.com', password: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects a missing field', () => {
    expect(loginSchema.safeParse({ email: 'csr@example.com' }).success).toBe(false);
  });
});
