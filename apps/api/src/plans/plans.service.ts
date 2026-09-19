import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PRISMA_ERROR_CODE } from '../common/constants/prisma-error-codes.js';
import type { CreatePlanDto, PlanDto, UpdatePlanDto } from '@amp-csr/shared';
import { toPlanDto } from '../common/mappers/plan.mapper.js';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<PlanDto[]> {
    const plans = await this.prisma.plan.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
    return plans.map(toPlanDto);
  }

  async findAll(): Promise<PlanDto[]> {
    const plans = await this.prisma.plan.findMany({ orderBy: { name: 'asc' } });
    return plans.map(toPlanDto);
  }

  async create(data: CreatePlanDto): Promise<PlanDto> {
    return toPlanDto(await this.prisma.plan.create({ data }));
  }

  // Disabling a plan only stops new subscriptions to it (see SubscriptionsService.create);
  // existing subscribers keep it, so updates stay allowed on a disabled plan — that's how it's re-enabled.
  async update(id: number, data: UpdatePlanDto): Promise<PlanDto> {
    try {
      return toPlanDto(await this.prisma.plan.update({ where: { id }, data }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new NotFoundException(`Plan ${id} not found`);
      }
      throw error;
    }
  }
}
