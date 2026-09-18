import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import type { PlanDto } from '@amp-csr/shared';
import { planDto } from '../test/fixtures.js';

describe('PlansController', () => {
  let plansController: PlansController;
  let plansService: {
    findActive: () => Promise<PlanDto[]>;
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
      const plans = [planDto];
      vi.mocked(plansService.findActive).mockResolvedValue(plans);

      await expect(plansController.findActive()).resolves.toBe(plans);
    });
  });
});
