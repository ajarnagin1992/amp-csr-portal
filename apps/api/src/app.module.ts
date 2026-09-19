import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GatewaySecretGuard } from './common/guards/gateway-secret.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SessionGuard } from './auth/session.guard.js';
import { UsersModule } from './users/users.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { PlansModule } from './plans/plans.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, SubscriptionsModule, PlansModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in registration order: prove the request came through
    // the gateway before spending a DB lookup on its session.
    { provide: APP_GUARD, useClass: GatewaySecretGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
