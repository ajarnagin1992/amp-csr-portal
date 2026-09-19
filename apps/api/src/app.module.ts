import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GatewaySecretGuard } from './common/guards/gateway-secret.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { PlansModule } from './plans/plans.module.js';

@Module({
  imports: [PrismaModule, UsersModule, SubscriptionsModule, PlansModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: GatewaySecretGuard }],
})
export class AppModule {}
