import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import type { PlanDto } from '@amp-csr/shared';
import { planDto } from '../test/fixtures.js';

describe('PlansController', () => {
  let plansController: PlansController;
  let plansService: {
    findActive: () => Promise<PlanDto[]>;
    findAll: () => Promise<PlanDto[]>;
    create: (data: { name: string; price: number }) => Promise<PlanDto>;
    update: (id: number, data: { price?: number }) => Promise<PlanDto>;
  };

  beforeEach(async () => {
    plansService = { findActive: vi.fn(), findAll: vi.fn(), create: vi.fn(), update: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: plansService }],
    }).compile();

    plansController = app.get<PlansController>(PlansController);
  });

  describe('find', () => {
    it('returns the active plans from the service by default', async () => {
      const plans = [planDto];
      vi.mocked(plansService.findActive).mockResolvedValue(plans);

      await expect(plansController.find({ includeDisabled: false })).resolves.toBe(plans);
      expect(plansService.findAll).not.toHaveBeenCalled();
    });

    it('returns every plan when includeDisabled is set', async () => {
      const plans = [planDto, { ...planDto, id: 2, status: 'DISABLED' as const }];
      vi.mocked(plansService.findAll).mockResolvedValue(plans);

      await expect(plansController.find({ includeDisabled: true })).resolves.toBe(plans);
      expect(plansService.findActive).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('passes the body to the service and returns the created plan', async () => {
      vi.mocked(plansService.create).mockResolvedValue(planDto);

      await expect(plansController.create({ name: 'Unlimited Monthly', price: 2999 })).resolves.toBe(planDto);
      expect(plansService.create).toHaveBeenCalledWith({ name: 'Unlimited Monthly', price: 2999 });
    });
  });

  describe('update', () => {
    it('passes the id and body to the service and returns the updated plan', async () => {
      vi.mocked(plansService.update).mockResolvedValue(planDto);

      await expect(plansController.update(1, { price: 3999 })).resolves.toBe(planDto);
      expect(plansService.update).toHaveBeenCalledWith(1, { price: 3999 });
    });
  });
});
