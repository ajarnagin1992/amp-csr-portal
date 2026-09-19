import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginThrottle } from './login-throttle.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LoginThrottle],
  exports: [AuthService],
})
export class AuthModule {}
