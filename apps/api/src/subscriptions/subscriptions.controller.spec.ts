import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import type { SubscriptionDto } from '@amp-csr/shared';
import { subscriptionDto } from '../test/fixtures.js';

describe('SubscriptionsController', () => {
  let subscriptionsController: SubscriptionsController;
  let subscriptionsService: {
    create: (vehicleId: number, planId: number) => Promise<SubscriptionDto>;
    cancel: (id: number) => Promise<SubscriptionDto>;
    transfer: (id: number, newVehicleId: number) => Promise<SubscriptionDto>;
  };

  beforeEach(async () => {
    subscriptionsService = { create: vi.fn(), cancel: vi.fn(), transfer: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [{ provide: SubscriptionsService, useValue: subscriptionsService }],
    }).compile();

    subscriptionsController = app.get<SubscriptionsController>(SubscriptionsController);
  });

  describe('create', () => {
    it('returns the created subscription from the service', async () => {
      vi.mocked(subscriptionsService.create).mockResolvedValue(subscriptionDto);

      await expect(subscriptionsController.create({ vehicleId: 1, planId: 2 })).resolves.toBe(subscriptionDto);
    });

    it('passes the vehicleId and planId from the request body through to the service', async () => {
      vi.mocked(subscriptionsService.create).mockResolvedValue(subscriptionDto);

      await subscriptionsController.create({ vehicleId: 1, planId: 2 });

      expect(subscriptionsService.create).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('cancel', () => {
    it('returns the cancelled subscription from the service', async () => {
      const cancelled = { ...subscriptionDto, status: 'CANCELLED' } as const;
      vi.mocked(subscriptionsService.cancel).mockResolvedValue(cancelled);

      await expect(subscriptionsController.cancel(1)).resolves.toBe(cancelled);
    });

    it('passes the id from the route through to the service', async () => {
      vi.mocked(subscriptionsService.cancel).mockResolvedValue(subscriptionDto);

      await subscriptionsController.cancel(1);

      expect(subscriptionsService.cancel).toHaveBeenCalledWith(1);
      expect(subscriptionsService.transfer).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    it('returns the new subscription from the service', async () => {
      const transferred = { ...subscriptionDto, id: 2 };
      vi.mocked(subscriptionsService.transfer).mockResolvedValue(transferred);

      await expect(subscriptionsController.transfer(1, { vehicleId: 5 })).resolves.toBe(transferred);
    });

    it('passes the id from the route and the vehicleId from the body through to the service', async () => {
      vi.mocked(subscriptionsService.transfer).mockResolvedValue(subscriptionDto);

      await subscriptionsController.transfer(1, { vehicleId: 5 });

      expect(subscriptionsService.transfer).toHaveBeenCalledWith(1, 5);
      expect(subscriptionsService.cancel).not.toHaveBeenCalled();
    });
  });
});
