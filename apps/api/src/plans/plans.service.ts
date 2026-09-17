import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Plan } from '../generated/prisma/client.js';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  findActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  }
}
