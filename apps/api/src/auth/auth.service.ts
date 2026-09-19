import { createHash, randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CsrUserDto } from '@amp-csr/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCsrUserDto } from '../common/mappers/csr-user.mapper.js';
import { LoginThrottle } from './login-throttle.js';
import { hashPassword, verifyPassword } from './password.js';
import { SESSION_TTL_MS } from './session-cookie.js';

export interface LoginResult {
  user: CsrUserDto;
  token: string;
  expiresAt: Date;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Verified against when the email is unknown, so a miss costs the same as a
// wrong password and login timing doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly throttle: LoginThrottle,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    if (this.throttle.isBlocked(email)) {
      throw new HttpException('Too many failed attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.csrUser.findUnique({ where: { email } });
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      this.throttle.recordFailure(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.throttle.reset(email);

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.csrSession.deleteMany({ where: { csrUserId: user.id, expiresAt: { lte: new Date() } } });
    await this.prisma.csrSession.create({ data: { csrUserId: user.id, tokenHash: hashToken(token), expiresAt } });

    return { user: toCsrUserDto(user), token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.csrSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  /** The CSR the token belongs to, or undefined if it is unknown, expired, or the CSR was disabled. */
  async validateSession(token: string): Promise<CsrUserDto | undefined> {
    const session = await this.prisma.csrSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { csrUser: true },
    });
    if (!session || session.expiresAt <= new Date() || session.csrUser.status !== 'ACTIVE') return undefined;
    return toCsrUserDto(session.csrUser);
  }
}
