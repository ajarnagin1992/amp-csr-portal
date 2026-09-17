import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Plan, Prisma } from '../generated/prisma/client.js';

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
    it('returns the plans from Prisma', async () => {
      const plans = [{ id: 1 }, { id: 2 }] as Plan[];
      vi.mocked(prisma.plan.findMany).mockResolvedValue(plans);

      await expect(plansService.findActive()).resolves.toEqual(plans);
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
