import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export const GATEWAY_SECRET_HEADER = 'x-gateway-secret';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Only the Cloudflare gateway Worker should reach this API. The Worker adds
 * `X-Gateway-Secret` to every proxied request; anything without a matching
 * value is rejected, so hitting the public onrender.com URL directly gets 401.
 *
 * `GATEWAY_SECRET_PREVIOUS` is optional and lets a rotation overlap: deploy the
 * new secret to the API with the old one as PREVIOUS, update the Worker, then
 * drop PREVIOUS.
 *
 * Production fails closed: the app refuses to boot without a secret (on Render
 * a failed boot leaves the previous deploy serving). Elsewhere (local dev,
 * tests) an unset secret disables the check, since `vite dev` proxies straight
 * to the API without going through the Worker.
 */
@Injectable()
export class GatewaySecretGuard implements CanActivate {
  private readonly logger = new Logger(GatewaySecretGuard.name);
  private readonly accepted: Buffer[];

  constructor(private readonly reflector: Reflector) {
    this.accepted = [
      process.env.GATEWAY_SECRET,
      process.env.GATEWAY_SECRET_PREVIOUS,
    ]
      .filter((secret): secret is string => !!secret)
      .map(digest);

    if (this.accepted.length === 0) {
      // Render sets RENDER=true on every service, so this doesn't depend on
      // NODE_ENV (which would also change how the build installs dependencies).
      if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        throw new Error('GATEWAY_SECRET must be set in production');
      }
      this.logger.warn('GATEWAY_SECRET is not set; gateway check disabled');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.accepted.length === 0) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const header = context
      .switchToHttp()
      .getRequest<Request>().headers[GATEWAY_SECRET_HEADER];
    const provided = typeof header === 'string' ? digest(header) : undefined;

    // Compare fixed-length digests in constant time; check every accepted
    // secret so timing doesn't reveal which one (if any) matched.
    const matched = this.accepted
      .map((secret) => !!provided && timingSafeEqual(secret, provided))
      .some(Boolean);
    if (!matched) throw new UnauthorizedException();
    return true;
  }
}
