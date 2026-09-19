import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GatewaySecretGuard } from './gateway-secret.guard.js';
import { Public } from './public.decorator.js';

class PrivateController {
  handler() {}
}

class PublicController {
  @Public()
  handler() {}
}

function contextFor(
  controller: { prototype: { handler: () => void } },
  headers: Record<string, string> = {},
): ExecutionContext {
  return {
    getHandler: () => controller.prototype.handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('GatewaySecretGuard', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  function setEnv(env: Record<string, string | undefined>) {
    delete process.env.GATEWAY_SECRET;
    delete process.env.GATEWAY_SECRET_PREVIOUS;
    delete process.env.NODE_ENV;
    delete process.env.RENDER;
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
  }

  const build = () => new GatewaySecretGuard(new Reflector());

  it('allows a request carrying the secret', () => {
    setEnv({ GATEWAY_SECRET: 's3cret' });
    const ctx = contextFor(PrivateController, { 'x-gateway-secret': 's3cret' });
    expect(build().canActivate(ctx)).toBe(true);
  });

  it('rejects a request with no secret header', () => {
    setEnv({ GATEWAY_SECRET: 's3cret' });
    expect(() => build().canActivate(contextFor(PrivateController))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with the wrong secret', () => {
    setEnv({ GATEWAY_SECRET: 's3cret' });
    const ctx = contextFor(PrivateController, { 'x-gateway-secret': 'nope' });
    expect(() => build().canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('accepts the previous secret during a rotation', () => {
    setEnv({ GATEWAY_SECRET: 'new', GATEWAY_SECRET_PREVIOUS: 'old' });
    const ctx = contextFor(PrivateController, { 'x-gateway-secret': 'old' });
    expect(build().canActivate(ctx)).toBe(true);
  });

  it('lets @Public() routes through without the secret', () => {
    setEnv({ GATEWAY_SECRET: 's3cret' });
    expect(build().canActivate(contextFor(PublicController))).toBe(true);
  });

  it('refuses to boot without a secret in production', () => {
    setEnv({ NODE_ENV: 'production' });
    expect(build).toThrow('GATEWAY_SECRET');
  });

  it('refuses to boot without a secret on Render', () => {
    setEnv({ RENDER: 'true' });
    expect(build).toThrow('GATEWAY_SECRET');
  });

  it('disables the check outside production when no secret is set', () => {
    setEnv({});
    expect(build().canActivate(contextFor(PrivateController))).toBe(true);
  });
});
