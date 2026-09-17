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

  describe('update', () => {
    it('calls cancel when the body has a status', async () => {
      const subscription = { id: 1, status: 'CANCELLED' } as Subscription;
      vi.mocked(subscriptionsService.cancel).mockResolvedValue(subscription);

      await expect(subscriptionsController.update(1, { status: 'CANCELLED' })).resolves.toBe(subscription);
      expect(subscriptionsService.cancel).toHaveBeenCalledWith(1);
      expect(subscriptionsService.transfer).not.toHaveBeenCalled();
    });

    it('calls transfer when the body has a transferVehicleId', async () => {
      const subscription = { id: 1, vehicleId: 5 } as Subscription;
      vi.mocked(subscriptionsService.transfer).mockResolvedValue(subscription);

      await expect(subscriptionsController.update(1, { transferVehicleId: 5 })).resolves.toBe(subscription);
      expect(subscriptionsService.transfer).toHaveBeenCalledWith(1, 5);
      expect(subscriptionsService.cancel).not.toHaveBeenCalled();
    });
  });
});
