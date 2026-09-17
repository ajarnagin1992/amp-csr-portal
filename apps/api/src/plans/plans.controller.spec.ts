import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import type { Plan } from '../generated/prisma/client.js';

describe('PlansController', () => {
  let plansController: PlansController;
  let plansService: {
    findActive: () => Promise<Plan[]>;
  };

  beforeEach(async () => {
    plansService = { findActive: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: plansService }],
    }).compile();

    plansController = app.get<PlansController>(PlansController);
  });

  describe('findActive', () => {
    it('returns the active plans from the service', async () => {
      const plans = [{ id: 1 }, { id: 2 }] as Plan[];
      vi.mocked(plansService.findActive).mockResolvedValue(plans);

      await expect(plansController.findActive()).resolves.toBe(plans);
    });
  });
});
