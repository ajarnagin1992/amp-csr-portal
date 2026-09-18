import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import type { Subscription } from '../generated/prisma/client.js';

describe('SubscriptionsController', () => {
  let subscriptionsController: SubscriptionsController;
  let subscriptionsService: {
    create: (vehicleId: number, planId: number) => Promise<Subscription>;
    cancel: (id: number) => Promise<Subscription>;
    transfer: (id: number, newVehicleId: number) => Promise<Subscription>;
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
      const subscription = { id: 1 } as Subscription;
      vi.mocked(subscriptionsService.create).mockResolvedValue(subscription);

      await expect(subscriptionsController.create({ vehicleId: 1, planId: 2 })).resolves.toBe(subscription);
    });

    it('passes the vehicleId and planId from the request body through to the service', async () => {
      vi.mocked(subscriptionsService.create).mockResolvedValue({} as Subscription);

      await subscriptionsController.create({ vehicleId: 1, planId: 2 });

      expect(subscriptionsService.create).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('cancel', () => {
    it('returns the cancelled subscription from the service', async () => {
      const subscription = { id: 1, status: 'CANCELLED' } as Subscription;
      vi.mocked(subscriptionsService.cancel).mockResolvedValue(subscription);

      await expect(subscriptionsController.cancel(1)).resolves.toBe(subscription);
    });

    it('passes the id from the route through to the service', async () => {
      vi.mocked(subscriptionsService.cancel).mockResolvedValue({} as Subscription);

      await subscriptionsController.cancel(1);

      expect(subscriptionsService.cancel).toHaveBeenCalledWith(1);
      expect(subscriptionsService.transfer).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    it('returns the new subscription from the service', async () => {
      const subscription = { id: 2, vehicleId: 5 } as Subscription;
      vi.mocked(subscriptionsService.transfer).mockResolvedValue(subscription);

      await expect(subscriptionsController.transfer(1, { vehicleId: 5 })).resolves.toBe(subscription);
    });

    it('passes the id from the route and the vehicleId from the body through to the service', async () => {
      vi.mocked(subscriptionsService.transfer).mockResolvedValue({} as Subscription);

      await subscriptionsController.transfer(1, { vehicleId: 5 });

      expect(subscriptionsService.transfer).toHaveBeenCalledWith(1, 5);
      expect(subscriptionsService.cancel).not.toHaveBeenCalled();
    });
  });
});
