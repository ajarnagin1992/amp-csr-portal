import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type Plan, type Subscription, type Vehicle } from '../generated/prisma/client.js';
import type { SubscriptionWithPlan } from '../common/mappers/subscription.mapper.js';
import { planRow, subscriptionDto, subscriptionRow, userRow, vehicleRow } from '../test/fixtures.js';

describe('SubscriptionsService', () => {
  let subscriptionsService: SubscriptionsService;
  let prisma: {
    plan: {
      findUnique: (args: Prisma.PlanFindUniqueArgs) => Promise<Plan | undefined>;
    };
    vehicle: {
      // create() loads the vehicle with its owner, so this is wider than Vehicle.
      findUnique: (args: Prisma.VehicleFindUniqueArgs) => Promise<unknown>;
    };
    subscription: {
      findFirst: (args: Prisma.SubscriptionFindFirstArgs) => Promise<Subscription | undefined>;
      findUnique: (args: Prisma.SubscriptionFindUniqueArgs) => Promise<unknown>;
      create: (args: Prisma.SubscriptionCreateArgs) => Promise<SubscriptionWithPlan>;
      update: (args: Prisma.SubscriptionUpdateArgs) => Promise<SubscriptionWithPlan>;
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
    const activeOwnerVehicle = { ...vehicleRow, id: 10, mobileUserId: 1, mobileUser: userRow };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      // create() resolves the vehicle's owner before anything else, to refuse
      // adding a subscription to a disabled account.
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(activeOwnerVehicle);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates and returns the new subscription as a SubscriptionDto', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscriptionRow);

      await expect(subscriptionsService.create(10, planRow.id)).resolves.toEqual(subscriptionDto);
    });

    it('throws NotFoundException when the vehicle does not exist, without creating', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(subscriptionsService.create(10, planRow.id)).rejects.toThrow(NotFoundException);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the vehicle owner is disabled, without creating', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        ...activeOwnerVehicle,
        mobileUser: { ...userRow, status: 'DISABLED' },
      });

      await expect(subscriptionsService.create(10, planRow.id)).rejects.toThrow(ConflictException);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('drops the columns that are not part of the subscription contract', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscriptionRow);

      const subscription = await subscriptionsService.create(10, planRow.id);

      expect(subscription).not.toHaveProperty('vehicleId');
      expect(subscription).not.toHaveProperty('planId');
      expect(subscription).not.toHaveProperty('createdAt');
    });

    it('passes the vehicle, plan, ACTIVE status, and a one-month-out billing date to Prisma', async () => {
      const plan = { ...planRow, id: 5 };
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(plan);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscriptionRow);

      await subscriptionsService.create(10, 5);

      const data: Prisma.SubscriptionUncheckedCreateInput = {
        vehicleId: 10,
        planId: 5,
        status: 'ACTIVE',
        nextBillingDate: new Date('2026-02-01T00:00:00.000Z'),
      };
      expect(prisma.subscription.create).toHaveBeenCalledWith({ data, include: { plan: true } });
    });

    it('fetches the plan before creating the subscription', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue({ ...planRow, id: 5 });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscriptionRow);

      await subscriptionsService.create(10, 5);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('checks for a live (ACTIVE or OVERDUE) subscription on the vehicle before creating', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockResolvedValue(subscriptionRow);

      await subscriptionsService.create(10, planRow.id);

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: 10, status: { in: ['ACTIVE', 'OVERDUE'] } },
        select: { id: true },
      });
    });

    it('throws NotFoundException when the plan does not exist', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(undefined);

      await expect(subscriptionsService.create(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the plan is disabled', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue({ ...planRow, status: 'DISABLED' });

      await expect(subscriptionsService.create(10, planRow.id)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the vehicle already has an active subscription', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({ ...subscriptionRow, id: 2, status: 'ACTIVE' });

      await expect(subscriptionsService.create(10, planRow.id)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when a concurrent request wins the race for the vehicle', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(subscriptionsService.create(10, planRow.id)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the vehicle does not exist', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planRow);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.subscription.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '7.10.0',
        }),
      );

      await expect(subscriptionsService.create(999, planRow.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels the subscription and returns it as a SubscriptionDto', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionRow);
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...subscriptionRow, status: 'CANCELLED' });

      await expect(subscriptionsService.cancel(1)).resolves.toEqual({ ...subscriptionDto, status: 'CANCELLED' });
    });

    it('passes the id and CANCELLED status to Prisma, including the plan the contract needs', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionRow);
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...subscriptionRow, status: 'CANCELLED' });

      await subscriptionsService.cancel(1);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CANCELLED' },
        include: { plan: true },
      });
    });

    it('looks the subscription up with its plan', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscriptionRow);
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...subscriptionRow, status: 'CANCELLED' });

      await subscriptionsService.cancel(1);

      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: { plan: true } });
    });

    it('throws NotFoundException when the subscription does not exist', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(undefined);

      await expect(subscriptionsService.cancel(999)).rejects.toThrow(NotFoundException);
    });

    it('is a no-op that returns the subscription when it is already CANCELLED', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ ...subscriptionRow, status: 'CANCELLED' });

      await expect(subscriptionsService.cancel(1)).resolves.toEqual({ ...subscriptionDto, status: 'CANCELLED' });
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the subscription has been TRANSFERRED', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ ...subscriptionRow, status: 'TRANSFERRED' });

      await expect(subscriptionsService.cancel(1)).rejects.toThrow(ConflictException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    const subscription = {
      ...subscriptionRow,
      id: 1,
      planId: 5,
      vehicleId: 10,
      vehicle: { id: 10, mobileUserId: 100, mobileUser: { ...userRow, id: 100 } },
    };
    const targetVehicle = { id: 20, mobileUserId: 100 } as Vehicle;

    it('throws ConflictException when the subscription is already terminal, without transferring', async () => {
      // Otherwise a CANCELLED subscription transfers into a fresh ACTIVE one, which is how a
      // disabled account (whose subscriptions deactivate() cancelled) got billing back.
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ ...subscription, status: 'CANCELLED' });

      await expect(subscriptionsService.transfer(1, 20)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the owner is disabled, without transferring', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...subscription,
        vehicle: { ...subscription.vehicle, mobileUser: { ...userRow, id: 100, status: 'DISABLED' } },
      });

      await expect(subscriptionsService.transfer(1, 20)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks the old subscription TRANSFERRED and returns the new one as a SubscriptionDto', async () => {
      const newSubscription = { ...subscriptionRow, id: 2, vehicleId: 20, planId: 5 };
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockResolvedValue([
        { ...subscriptionRow, status: 'TRANSFERRED' },
        newSubscription,
      ]);

      await expect(subscriptionsService.transfer(1, 20)).resolves.toEqual({ ...subscriptionDto, id: 2 });
    });

    it('carries over the same plan and billing date to the new subscription, and marks the old one TRANSFERRED', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockResolvedValue([subscriptionRow, subscriptionRow]);

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
        include: { plan: true },
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
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({ ...subscriptionRow, id: 3, status: 'ACTIVE' });

      await expect(subscriptionsService.transfer(1, 20)).rejects.toThrow(ConflictException);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: 20, status: { in: ['ACTIVE', 'OVERDUE'] } },
        select: { id: true },
      });
    });

    it('throws ConflictException when a concurrent request wins the race for the target vehicle', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(targetVehicle);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(subscriptionsService.transfer(1, 20)).rejects.toThrow(ConflictException);
    });
  });
});
