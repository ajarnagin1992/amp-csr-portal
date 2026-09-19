import { toCsrUserDto } from './csr-user.mapper.js';
import { csrUserDto, csrUserRow } from '../../test/fixtures.js';

describe('toCsrUserDto', () => {
  it('maps a CSR user row onto the CSR user contract', () => {
    expect(toCsrUserDto(csrUserRow)).toEqual(csrUserDto);
  });

  it('never exposes the password hash', () => {
    expect(toCsrUserDto(csrUserRow)).not.toHaveProperty('passwordHash');
  });
});
