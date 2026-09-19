import type { CsrUserDto } from '@amp-csr/shared';
import type { CsrUser } from '../../generated/prisma/client.js';

export function toCsrUserDto(user: CsrUser): CsrUserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}
