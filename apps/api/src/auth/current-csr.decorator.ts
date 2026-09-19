import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CsrUserDto } from '@amp-csr/shared';
import type { AuthenticatedRequest } from './session-cookie.js';

/** The CSR resolved by `SessionGuard`. Not available on `@AllowAnonymous()` routes. */
export const CurrentCsr = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CsrUserDto =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().csrUser,
);
