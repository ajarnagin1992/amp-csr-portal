import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Plan, Prisma } from '../generated/prisma/client.js';
import { planDto, planRow } from '../test/fixtures.js';

describe('PlansService', () => {
  let plansService: PlansService;
  let prisma: {
    plan: {
      findMany: (args: Prisma.PlanFindManyArgs) => Promise<Plan[]>;
    };
  };

  beforeEach(async () => {
    prisma = {
      plan: { findMany: vi.fn() },
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [PlansService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    plansService = app.get<PlansService>(PlansService);
  });

  describe('findActive', () => {
    it('returns the plans from Prisma as PlanDtos', async () => {
      vi.mocked(prisma.plan.findMany).mockResolvedValue([planRow]);

      await expect(plansService.findActive()).resolves.toEqual([planDto]);
    });

    it('drops the columns that are not part of the plan contract', async () => {
      vi.mocked(prisma.plan.findMany).mockResolvedValue([planRow]);

      const [plan] = await plansService.findActive();

      expect(plan).not.toHaveProperty('createdAt');
      expect(plan).not.toHaveProperty('lastUpdated');
    });

    it('filters to ACTIVE plans only, ordered by name', async () => {
      vi.mocked(prisma.plan.findMany).mockResolvedValue([]);

      await plansService.findActive();

      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });
    });
  });
});
