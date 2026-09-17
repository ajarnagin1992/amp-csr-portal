import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsModule } from './subscriptions.module.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

describe('SubscriptionsModule', () => {
  it('wires SubscriptionsController and SubscriptionsService together', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, SubscriptionsModule],
    }).compile();

    expect(moduleRef.get(SubscriptionsController)).toBeInstanceOf(SubscriptionsController);
    expect(moduleRef.get(SubscriptionsService)).toBeInstanceOf(SubscriptionsService);
  });
});
