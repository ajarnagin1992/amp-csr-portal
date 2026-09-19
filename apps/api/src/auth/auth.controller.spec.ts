import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService, type LoginResult } from './auth.service.js';
import { SESSION_COOKIE } from './session-cookie.js';
import { csrUserDto } from '../test/fixtures.js';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: {
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: (token: string) => Promise<void>;
  };
  let response: { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };

  const requestWith = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as Request;

  beforeEach(async () => {
    authService = { login: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) };
    response = { cookie: vi.fn(), clearCookie: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    authController = app.get<AuthController>(AuthController);
  });

  describe('login', () => {
    const expiresAt = new Date('2026-01-01T08:00:00.000Z');

    beforeEach(() => {
      vi.mocked(authService.login).mockResolvedValue({ user: csrUserDto, token: 'session-token', expiresAt });
    });

    it('returns the CSR', async () => {
      const result = await authController.login(
        { email: 'csr@example.com', password: 'pw' },
        response as unknown as Response,
      );

      expect(result).toBe(csrUserDto);
      expect(authService.login).toHaveBeenCalledWith('csr@example.com', 'pw');
    });

    it('sets the session as an HttpOnly cookie expiring with the session', async () => {
      await authController.login({ email: 'csr@example.com', password: 'pw' }, response as unknown as Response);

      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE,
        'session-token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', expires: expiresAt }),
      );
    });

    it('does not set a cookie when login fails', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('nope'));

      await expect(
        authController.login({ email: 'csr@example.com', password: 'pw' }, response as unknown as Response),
      ).rejects.toThrow('nope');
      expect(response.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes the session and clears the cookie', async () => {
      await authController.logout(requestWith('csr_session=session-token'), response as unknown as Response);

      expect(authService.logout).toHaveBeenCalledWith('session-token');
      expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.objectContaining({ httpOnly: true }));
    });

    it('still clears the cookie when there was no session to delete', async () => {
      await authController.logout(requestWith(), response as unknown as Response);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.any(Object));
    });
  });

  describe('me', () => {
    it('returns the CSR the guard resolved', () => {
      expect(authController.me(csrUserDto)).toBe(csrUserDto);
    });
  });
});
