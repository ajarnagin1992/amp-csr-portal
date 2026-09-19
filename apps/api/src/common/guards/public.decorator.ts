import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Exempts a route from the gateway-secret check (e.g. Render's health check). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
