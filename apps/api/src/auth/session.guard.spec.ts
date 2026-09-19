import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import type { AuthenticatedRequest } from './session-cookie.js';
import { AllowAnonymous } from '../common/guards/allow-anonymous.decorator.js';
import { Public } from '../common/guards/public.decorator.js';
import { csrUserDto } from '../test/fixtures.js';

class PrivateController {
  handler() {}
}

class AnonymousController {
  @AllowAnonymous()
  handler() {}
}

class PublicController {
  @Public()
  handler() {}
}

@AllowAnonymous()
class AnonymousClassController {
  handler() {}
}

function contextFor(controller: { prototype: { handler: () => void } }, request: object): ExecutionContext {
  return {
    getHandler: () => controller.prototype.handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  let authService: { validateSession: (token: string) => Promise<typeof csrUserDto | undefined> };
  let guard: SessionGuard;

  beforeEach(() => {
    authService = { validateSession: vi.fn().mockResolvedValue(csrUserDto) };
    guard = new SessionGuard(new Reflector(), authService as unknown as AuthService);
  });

  it('lets a request with a valid session cookie through', async () => {
    const request = { headers: { cookie: 'csr_session=good-token' } };

    await expect(guard.canActivate(contextFor(PrivateController, request))).resolves.toBe(true);
    expect(authService.validateSession).toHaveBeenCalledWith('good-token');
  });

  it('attaches the CSR to the request', async () => {
    const request: Partial<AuthenticatedRequest> = { headers: { cookie: 'csr_session=good-token' } };

    await guard.canActivate(contextFor(PrivateController, request));

    expect(request.csrUser).toEqual(csrUserDto);
  });

  it('rejects a request with no cookie, without touching the database', async () => {
    await expect(guard.canActivate(contextFor(PrivateController, { headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('rejects a request whose only cookies are unrelated', async () => {
    const request = { headers: { cookie: 'theme=dark' } };

    await expect(guard.canActivate(contextFor(PrivateController, request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token the service does not recognise', async () => {
    vi.mocked(authService.validateSession).mockResolvedValue(undefined);
    const request = { headers: { cookie: 'csr_session=stale-token' } };

    await expect(guard.canActivate(contextFor(PrivateController, request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    ['@AllowAnonymous() handlers', AnonymousController],
    ['@AllowAnonymous() classes', AnonymousClassController],
    ['@Public() handlers', PublicController],
  ])('skips the check for %s', async (_name, controller) => {
    await expect(guard.canActivate(contextFor(controller, { headers: {} }))).resolves.toBe(true);
    expect(authService.validateSession).not.toHaveBeenCalled();
  });
});
