import { Body, Controller, Get, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginSchema, type CsrUserDto, type LoginDto } from '@amp-csr/shared';
import { AllowAnonymous } from '../common/guards/allow-anonymous.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { CurrentCsr } from './current-csr.decorator.js';
import { readCookie, SESSION_COOKIE, sessionCookieOptions } from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AllowAnonymous()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CsrUserDto> {
    const { user, token, expiresAt } = await this.authService.login(dto.email, dto.password);
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return user;
  }

  // Anonymous so a CSR whose session already expired can still clear the cookie.
  @AllowAnonymous()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await this.authService.logout(token);
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@CurrentCsr() user: CsrUserDto): CsrUserDto {
    return user;
  }
}
