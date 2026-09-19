import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PRISMA_ERROR_CODE } from '../common/constants/prisma-error-codes.js';
import { LIVE_STATUSES_SUBSCRIPTION, TERMINAL_STATUSES_SUBSCRIPTION } from '../common/constants/terminal-statuses.js';
import type { SubscriptionDto } from '@amp-csr/shared';
import { toSubscriptionDto } from '../common/mappers/subscription.mapper.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicleId: number, planId: number): Promise<SubscriptionDto> {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }
    if (plan.status === 'DISABLED') {
      throw new BadRequestException('Cannot subscribe to a disabled plan');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { mobileUser: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }
    if (vehicle.mobileUser.status === 'DISABLED') {
      throw new ConflictException(
        `User ${vehicle.mobileUserId} is disabled; reactivate the account before adding a subscription`,
      );
    }

    if (await this.hasLiveSubscription(vehicleId)) {
      throw new ConflictException(`Vehicle ${vehicleId} already has an active subscription`);
    }

    const nextBillingDate = new Date();
    nextBillingDate.setUTCMonth(nextBillingDate.getUTCMonth() + 1);

    try {
      return toSubscriptionDto(
        await this.prisma.subscription.create({
          data: { vehicleId, planId, status: 'ACTIVE', nextBillingDate },
          include: { plan: true },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION
      ) {
        throw new NotFoundException(`Vehicle ${vehicleId} not found`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(`Vehicle ${vehicleId} already has an active subscription`);
      }
      throw error;
    }
  }

  async cancel(id: number): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    if (subscription.status === 'CANCELLED') {
      return toSubscriptionDto(subscription);
    }

    if (TERMINAL_STATUSES_SUBSCRIPTION.has(subscription.status)) {
      throw new ConflictException(`Subscription ${id} is ${subscription.status} and cannot be cancelled`);
    }

    return toSubscriptionDto(
      await this.prisma.subscription.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { plan: true },
      }),
    );
  }

  async transfer(id: number, newVehicleId: number): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { vehicle: { include: { mobileUser: true } } },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    // Without this, a CANCELLED subscription could be transferred into a brand new ACTIVE one —
    // which is how a disabled account (deactivate cancels its subscriptions) got billing back.
    if (TERMINAL_STATUSES_SUBSCRIPTION.has(subscription.status)) {
      throw new ConflictException(`Subscription ${id} is ${subscription.status} and cannot be transferred`);
    }

    if (subscription.vehicle.mobileUser.status === 'DISABLED') {
      throw new ConflictException(
        `User ${subscription.vehicle.mobileUserId} is disabled; reactivate the account before transferring a subscription`,
      );
    }

    const targetVehicle = await this.prisma.vehicle.findUnique({ where: { id: newVehicleId } });
    if (!targetVehicle) {
      throw new NotFoundException(`Vehicle ${newVehicleId} not found`);
    }

    if (targetVehicle.mobileUserId !== subscription.vehicle.mobileUserId) {
      throw new BadRequestException('Cannot transfer a subscription to a vehicle owned by a different customer');
    }

    if (await this.hasLiveSubscription(newVehicleId)) {
      throw new ConflictException(`Vehicle ${newVehicleId} already has an active subscription`);
    }

    try {
      const [, newSubscription] = await this.prisma.$transaction([
        this.prisma.subscription.update({ where: { id }, data: { status: 'TRANSFERRED' } }),
        this.prisma.subscription.create({
          data: {
            vehicleId: newVehicleId,
            planId: subscription.planId,
            status: 'ACTIVE',
            nextBillingDate: subscription.nextBillingDate,
          },
          include: { plan: true },
        }),
      ]);

      return toSubscriptionDto(newSubscription);
    } catch (error) {
      // Lost a race with a concurrent create/transfer onto the same vehicle; the transaction rolled back.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(`Vehicle ${newVehicleId} already has an active subscription`);
      }
      throw error;
    }
  }

  // Served by the partial unique index on subscriptions(vehicle_id) WHERE status IN (ACTIVE, OVERDUE).
  private async hasLiveSubscription(vehicleId: number): Promise<boolean> {
    const live = await this.prisma.subscription.findFirst({
      where: { vehicleId, status: { in: LIVE_STATUSES_SUBSCRIPTION } },
      select: { id: true },
    });
    return Boolean(live);
  }
}
