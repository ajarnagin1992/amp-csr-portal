import { Test, TestingModule } from '@nestjs/testing';
import { PlansModule } from './plans.module.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

describe('PlansModule', () => {
  it('wires PlansController and PlansService together', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PlansModule],
    }).compile();

    expect(moduleRef.get(PlansController)).toBeInstanceOf(PlansController);
    expect(moduleRef.get(PlansService)).toBeInstanceOf(PlansService);
  });
});
