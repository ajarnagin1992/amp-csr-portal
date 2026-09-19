import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the password that was hashed', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('Correct horse battery staple', hash)).resolves.toBe(false);
  });

  it('salts each hash, so the same password hashes differently twice', async () => {
    const [first, second] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(first).not.toBe(second);
  });

  it('does not contain the plaintext password', async () => {
    expect(await hashPassword('plaintext-marker')).not.toContain('plaintext-marker');
  });

  it('records the scheme and cost parameters in the stored value', async () => {
    const [scheme, n, r, p] = (await hashPassword('x')).split('$');
    expect([scheme, n, r, p]).toEqual(['scrypt', '32768', '8', '3']);
  });

  it.each(['', 'plain-text-password', 'bcrypt$10$abc$def', 'scrypt$1$2$3$onlyfourparts'])(
    'rejects the malformed stored value %j instead of throwing',
    async (stored) => {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false);
    },
  );
});
