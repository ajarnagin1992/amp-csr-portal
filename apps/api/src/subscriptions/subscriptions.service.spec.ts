import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type Plan, type Subscription, type Vehicle } from '../generated/prisma/client.js';

describe('SubscriptionsService', () => {
  let subscriptionsService: SubscriptionsService;
  let prisma: {
    plan: {
      findUnique: (args: Prisma.PlanFindUniqueArgs) => Promise<Plan | undefined>;
    };
    vehicle: {
      findUnique: (args: Prisma.VehicleFindUniqueArgs) => Promise<Vehicle | undefined>;
    };
    subscription: {
      findFirst: (args: Prisma.SubscriptionFindFirstArgs) => Promise<Subscription | undefined>;
      findUnique: (args: Prisma.SubscriptionFindUniqueArgs) => Promise<unknown>;
      create: (args: Prisma.SubscriptionCreateArgs) => Promise<Subscription>;
      update: (args: Prisma.SubscriptionUpdateArgs) => Promise<Subscription>;
    };
    $transaction: (ops: unknown[]) => Promise<unknown[]>;
  };

  beforeEach(async () => {
    prisma = {
      plan: { findUnique: vi.fn() },
      vehicle: { findUnique: vi.fn() },
      subscription: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    subscriptionsService = app.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('create', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates and returns the new subscription', async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      const subscription = { id: 1, vehicleId: 10, planId: 5, status: 'ACTIVE' } as Subscription;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscription);

      await expect(subscriptionsService.create(10, 5)).resolves.toEqual(subscription);
    });

    it('passes the vehicle, plan, ACTIVE status, and a one-month-out billing date to Prisma', async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as Subscription);

      await subscriptionsService.create(10, 5);

      const data: Prisma.SubscriptionUncheckedCreateInput = {
        vehicleId: 10,
        planId: 5,
        status: 'ACTIVE',
        nextBillingDate: new Date('2026-02-01T00:00:00.000Z'),
      };
      expect(prisma.subscription.create).toHaveBeenCalledWith({ data });
    });

    it('fetches the plan before creating the subscription', async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as Subscription);

      await subscriptionsService.create(10, 5);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("checks the vehicle's current subscription before creating", async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as Subscription);

      await subscriptionsService.create(10, 5);

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: 10 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws NotFoundException when the plan does not exist', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(undefined);

      await expect(subscriptionsService.create(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the plan is disabled', async () => {
      const plan = { id: 5, status: 'DISABLED' } as Plan;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);

      await expect(subscriptionsService.create(10, 5)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the vehicle already has an active subscription', async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      const existing = { id: 2, status: 'ACTIVE' } as Subscription;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(existing);

      await expect(subscriptionsService.create(10, 5)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the vehicle does not exist', async () => {
      const plan = { id: 5, status: 'ACTIVE' } as Plan;
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '7.10.0',
        }),
      );

      await expect(subscriptionsService.create(999, 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels the subscription and returns it', async () => {
      const cancelled = { id: 1, status: 'CANCELLED' } as Subscription;
      vi.mocked(prisma.subscription.update).mockResolvedValue(cancelled);

      await expect(subscriptionsService.cancel(1)).resolves.toEqual(cancelled);
    });

    it('passes the id and CANCELLED status to Prisma', async () => {
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as Subscription);

      await subscriptionsService.cancel(1);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CANCELLED' },
      });
    });

    it('throws NotFoundException when the subscription does not exist', async () => {
      vi.mocked(prisma.subscription.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.10.0' }),
      );

      await expect(subscriptionsService.cancel(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('transfer', () => {
    const subscription = {
      id: 1,
      planId: 5,
      vehicleId: 10,
      nextBillingDate: new Date('2026-02-01T00:00:00.000Z'),
      vehicle: { id: 10, mobileUserId: 100 },
    };
    const targetVehicle = { id: 20, mobileUserId: 100 } as Vehicle;

    it('marks the old subscription TRANSFERRED and creates a new ACTIVE one on the target vehicle', async () => {
      const transferredOld = { id: 1, status: 'TRANSFERRED' } as Subscription;
      const newSubscription = { id: 2, vehicleId: 20, planId: 5, status: 'ACTIVE' } as Subscription;
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockResolvedValue([transferredOld, newSubscription]);

      await expect(subscriptionsService.transfer(1, 20)).resolves.toEqual(newSubscription);
    });

    it('carries over the same plan and billing date to the new subscription, and marks the old one TRANSFERRED', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockResolvedValue([{} as Subscription, {} as Subscription]);

      await subscriptionsService.transfer(1, 20);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'TRANSFERRED' },
      });
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          vehicleId: 20,
          planId: 5,
          status: 'ACTIVE',
          nextBillingDate: subscription.nextBillingDate,
        },
      });
    });

    it('throws NotFoundException when the subscription does not exist', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(undefined);

      await expect(subscriptionsService.transfer(999, 20)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the target vehicle does not exist', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(undefined);

      await expect(subscriptionsService.transfer(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the target vehicle belongs to a different owner', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({ id: 30, mobileUserId: 200 } as Vehicle);

      await expect(subscriptionsService.transfer(1, 30)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the target vehicle already has an active subscription', async () => {
      const existing = { id: 3, status: 'ACTIVE' } as Subscription;
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(existing);

      await expect(subscriptionsService.transfer(1, 20)).rejects.toThrow(ConflictException);
    });
  });
});
