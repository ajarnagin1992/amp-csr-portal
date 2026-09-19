import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_ANONYMOUS_KEY } from '../common/guards/allow-anonymous.decorator.js';
import { IS_PUBLIC_KEY } from '../common/guards/public.decorator.js';
import { AuthService } from './auth.service.js';
import { readCookie, SESSION_COOKIE, type AuthenticatedRequest } from './session-cookie.js';

/**
 * Requires a valid CSR session cookie on every route except those marked
 * `@AllowAnonymous()` or `@Public()`, and exposes the CSR as `request.csrUser`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const exempt = [ALLOW_ANONYMOUS_KEY, IS_PUBLIC_KEY].some((key) =>
      this.reflector.getAllAndOverride<boolean | undefined>(key, [context.getHandler(), context.getClass()]),
    );
    if (exempt) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, SESSION_COOKIE);
    const user = token ? await this.authService.validateSession(token) : undefined;
    if (!user) throw new UnauthorizedException();

    request.csrUser = user;
    return true;
  }
}
