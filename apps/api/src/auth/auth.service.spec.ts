import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginThrottle, MAX_FAILED_LOGINS } from './login-throttle.js';
import { hashPassword } from './password.js';
import { SESSION_TTL_MS } from './session-cookie.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CsrSession, CsrUser } from '../generated/prisma/client.js';
import { csrUserDto, csrUserRow } from '../test/fixtures.js';

const PASSWORD = 'correct horse battery staple';

describe('AuthService', () => {
  let authService: AuthService;
  let userRow: CsrUser;
  let prisma: {
    csrUser: { findUnique: (args: { where: { email: string } }) => Promise<CsrUser | null> };
    csrSession: {
      create: (args: { data: { csrUserId: number; tokenHash: string; expiresAt: Date } }) => Promise<CsrSession>;
      deleteMany: (args: { where: object }) => Promise<{ count: number }>;
      findUnique: (args: { where: { tokenHash: string }; include: object }) => Promise<unknown>;
    };
  };

  beforeAll(async () => {
    userRow = { ...csrUserRow, passwordHash: await hashPassword(PASSWORD) };
  });

  beforeEach(async () => {
    prisma = {
      csrUser: { findUnique: vi.fn().mockResolvedValue(userRow) },
      csrSession: {
        create: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
      },
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [AuthService, LoginThrottle, { provide: PrismaService, useValue: prisma }],
    }).compile();

    authService = app.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('returns the CSR without the password hash', async () => {
      const { user } = await authService.login('csr@example.com', PASSWORD);

      expect(user).toEqual(csrUserDto);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('looks the CSR up by email', async () => {
      await authService.login('csr@example.com', PASSWORD);

      expect(prisma.csrUser.findUnique).toHaveBeenCalledWith({ where: { email: 'csr@example.com' } });
    });

    it('stores only a hash of the session token, never the token itself', async () => {
      const { token } = await authService.login('csr@example.com', PASSWORD);

      const { data } = vi.mocked(prisma.csrSession.create).mock.calls[0][0];
      expect(data.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
      expect(data.tokenHash).not.toBe(token);
      expect(data.csrUserId).toBe(csrUserRow.id);
    });

    it('issues a different token each login', async () => {
      const first = await authService.login('csr@example.com', PASSWORD);
      const second = await authService.login('csr@example.com', PASSWORD);

      expect(first.token).not.toBe(second.token);
    });

    it('expires the session after the session lifetime', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        const { expiresAt } = await authService.login('csr@example.com', PASSWORD);
        expect(expiresAt.getTime()).toBe(Date.now() + SESSION_TTL_MS);
      } finally {
        vi.useRealTimers();
      }
    });

    it("sweeps that CSR's expired sessions", async () => {
      await authService.login('csr@example.com', PASSWORD);

      expect(prisma.csrSession.deleteMany).toHaveBeenCalledWith({
        where: { csrUserId: csrUserRow.id, expiresAt: { lte: expect.any(Date) } },
      });
    });

    it('rejects a wrong password without creating a session', async () => {
      await expect(authService.login('csr@example.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.csrSession.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same error as a wrong password', async () => {
      vi.mocked(prisma.csrUser.findUnique).mockResolvedValue(null);

      const unknown = await authService.login('nobody@example.com', PASSWORD).catch((e: unknown) => e);
      const wrong = await authService.login('csr@example.com', 'wrong').catch((e: unknown) => e);

      expect(unknown).toBeInstanceOf(UnauthorizedException);
      expect(wrong).toBeInstanceOf(UnauthorizedException);
      expect((unknown as Error).message).toBe((wrong as Error).message);
      expect(prisma.csrSession.create).not.toHaveBeenCalled();
    });

    it('rejects a disabled CSR even with the right password', async () => {
      vi.mocked(prisma.csrUser.findUnique).mockResolvedValue({ ...userRow, status: 'DISABLED' });

      await expect(authService.login('csr@example.com', PASSWORD)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.csrSession.create).not.toHaveBeenCalled();
    });

    it('locks the email out after too many failures, even for the right password', async () => {
      for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
        await authService.login('csr@example.com', 'wrong').catch(() => undefined);
      }

      const error = await authService.login('csr@example.com', PASSWORD).catch((e: HttpException) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('does not consult the database while locked out', async () => {
      for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
        await authService.login('csr@example.com', 'wrong').catch(() => undefined);
      }
      vi.mocked(prisma.csrUser.findUnique).mockClear();

      await authService.login('csr@example.com', PASSWORD).catch(() => undefined);

      expect(prisma.csrUser.findUnique).not.toHaveBeenCalled();
    });

    it('forgives earlier failures after a successful login', async () => {
      for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) {
        await authService.login('csr@example.com', 'wrong').catch(() => undefined);
      }
      await authService.login('csr@example.com', PASSWORD);

      await expect(authService.login('csr@example.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes the session for that token', async () => {
      await authService.logout('the-token');

      expect(prisma.csrSession.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: createHash('sha256').update('the-token').digest('hex') },
      });
    });
  });

  describe('validateSession', () => {
    const session = (overrides: Partial<CsrSession & { csrUser: CsrUser }> = {}) => ({
      id: 1,
      csrUserId: csrUserRow.id,
      tokenHash: 'x',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      csrUser: csrUserRow,
      ...overrides,
    });

    it('resolves a live session to its CSR', async () => {
      vi.mocked(prisma.csrSession.findUnique).mockResolvedValue(session());

      await expect(authService.validateSession('the-token')).resolves.toEqual(csrUserDto);
    });

    it('looks the session up by the token hash', async () => {
      vi.mocked(prisma.csrSession.findUnique).mockResolvedValue(session());

      await authService.validateSession('the-token');

      expect(prisma.csrSession.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: createHash('sha256').update('the-token').digest('hex') },
        include: { csrUser: true },
      });
    });

    it('returns undefined for an unknown token', async () => {
      vi.mocked(prisma.csrSession.findUnique).mockResolvedValue(null);

      await expect(authService.validateSession('nope')).resolves.toBeUndefined();
    });

    it('returns undefined for an expired session', async () => {
      vi.mocked(prisma.csrSession.findUnique).mockResolvedValue(session({ expiresAt: new Date(Date.now() - 1) }));

      await expect(authService.validateSession('the-token')).resolves.toBeUndefined();
    });

    it('returns undefined once the CSR has been disabled, ending their live sessions', async () => {
      vi.mocked(prisma.csrSession.findUnique).mockResolvedValue(
        session({ csrUser: { ...csrUserRow, status: 'DISABLED' } }),
      );

      await expect(authService.validateSession('the-token')).resolves.toBeUndefined();
    });
  });
});
