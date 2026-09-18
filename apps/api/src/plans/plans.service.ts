import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PlanDto } from '@amp-csr/shared';
import { toPlanDto } from '../common/mappers/plan.mapper.js';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<PlanDto[]> {
    const plans = await this.prisma.plan.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
    return plans.map(toPlanDto);
  }
}
