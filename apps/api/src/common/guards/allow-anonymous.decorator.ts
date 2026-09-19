import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_KEY = 'allowAnonymous';

/**
 * Exempts a route from the CSR session check (e.g. login). Unlike `@Public()`,
 * the gateway-secret check still applies.
 */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);
