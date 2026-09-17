import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type Subscription } from '../generated/prisma/client.js';
import { PRISMA_ERROR_CODE } from '../common/constants/prisma-error-codes.js';
import { TERMINAL_STATUSES_SUBSCRIPTION } from '../common/constants/terminal-statuses.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicleId: number, planId: number): Promise<Subscription> {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }
    if (plan.status === 'DISABLED') {
      throw new BadRequestException('Cannot subscribe to a disabled plan');
    }

    const current = await this.prisma.subscription.findFirst({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
    if (current && !TERMINAL_STATUSES_SUBSCRIPTION.has(current.status)) {
      throw new ConflictException(`Vehicle ${vehicleId} already has an active subscription`);
    }

    const nextBillingDate = new Date();
    nextBillingDate.setUTCMonth(nextBillingDate.getUTCMonth() + 1);

    try {
      return await this.prisma.subscription.create({
        data: { vehicleId, planId, status: 'ACTIVE', nextBillingDate },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION
      ) {
        throw new NotFoundException(`Vehicle ${vehicleId} not found`);
      }
      throw error;
    }
  }

  async cancel(id: number): Promise<Subscription> {
    try {
      return await this.prisma.subscription.update({ where: { id }, data: { status: 'CANCELLED' } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.RECORD_NOT_FOUND
      ) {
        throw new NotFoundException(`Subscription ${id} not found`);
      }
      throw error;
    }
  }

  async transfer(id: number, newVehicleId: number): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    const targetVehicle = await this.prisma.vehicle.findUnique({ where: { id: newVehicleId } });
    if (!targetVehicle) {
      throw new NotFoundException(`Vehicle ${newVehicleId} not found`);
    }

    if (targetVehicle.mobileUserId !== subscription.vehicle.mobileUserId) {
      throw new BadRequestException('Cannot transfer a subscription to a vehicle owned by a different customer');
    }

    const targetCurrentSubscription = await this.prisma.subscription.findFirst({
      where: { vehicleId: newVehicleId },
      orderBy: { createdAt: 'desc' },
    });
    
    if (targetCurrentSubscription && !TERMINAL_STATUSES_SUBSCRIPTION.has(targetCurrentSubscription.status)) {
      throw new ConflictException(`Vehicle ${newVehicleId} already has an active subscription`);
    }

    const [, newSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({ where: { id }, data: { status: 'TRANSFERRED' } }),
      this.prisma.subscription.create({
        data: {
          vehicleId: newVehicleId,
          planId: subscription.planId,
          status: 'ACTIVE',
          nextBillingDate: subscription.nextBillingDate,
        },
      }),
    ]);

    return newSubscription;
  }
}
