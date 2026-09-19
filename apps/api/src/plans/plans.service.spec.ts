import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type Plan } from '../generated/prisma/client.js';
import { planDto, planRow } from '../test/fixtures.js';

describe('PlansService', () => {
  let plansService: PlansService;
  let prisma: {
    plan: {
      findMany: (args: Prisma.PlanFindManyArgs) => Promise<Plan[]>;
      create: (args: Prisma.PlanCreateArgs) => Promise<Plan>;
      update: (args: Prisma.PlanUpdateArgs) => Promise<Plan>;
    };
  };

  beforeEach(async () => {
    prisma = {
      plan: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
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

  describe('findAll', () => {
    it('returns every plan, disabled ones included, as PlanDtos', async () => {
      const disabledRow: Plan = { ...planRow, id: 2, status: 'DISABLED' };
      vi.mocked(prisma.plan.findMany).mockResolvedValue([planRow, disabledRow]);

      await expect(plansService.findAll()).resolves.toEqual([planDto, { ...planDto, id: 2, status: 'DISABLED' }]);
    });

    it('does not filter by status, and orders by name', async () => {
      vi.mocked(prisma.plan.findMany).mockResolvedValue([]);

      await plansService.findAll();

      expect(prisma.plan.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    });
  });

  describe('create', () => {
    it('creates the plan and returns it as a PlanDto', async () => {
      vi.mocked(prisma.plan.create).mockResolvedValue(planRow);

      await expect(
        plansService.create({ name: 'Unlimited Monthly', description: 'Unlimited exterior washes', price: 2999 }),
      ).resolves.toEqual(planDto);
    });

    it('passes the data to Prisma as-is, leaving status and description to the column defaults', async () => {
      vi.mocked(prisma.plan.create).mockResolvedValue(planRow);

      await plansService.create({ name: 'Basic Wash', price: 900 });

      expect(prisma.plan.create).toHaveBeenCalledWith({ data: { name: 'Basic Wash', price: 900 } });
    });
  });

  describe('update', () => {
    it('updates the plan and returns the updated record as a PlanDto', async () => {
      vi.mocked(prisma.plan.update).mockResolvedValue({ ...planRow, price: 3999 });

      await expect(plansService.update(1, { price: 3999 })).resolves.toEqual({ ...planDto, price: 3999 });
    });

    it('passes the id and the partial data to Prisma', async () => {
      vi.mocked(prisma.plan.update).mockResolvedValue(planRow);

      await plansService.update(1, { name: 'Renamed', description: 'New copy' });

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Renamed', description: 'New copy' },
      });
    });

    it('allows re-enabling a disabled plan', async () => {
      vi.mocked(prisma.plan.update).mockResolvedValue(planRow);

      await plansService.update(1, { status: 'ACTIVE' });

      expect(prisma.plan.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'ACTIVE' } });
    });

    it('throws NotFoundException when the plan does not exist', async () => {
      vi.mocked(prisma.plan.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.10.0' }),
      );

      await expect(plansService.update(999, { price: 100 })).rejects.toThrow(NotFoundException);
    });

    it('rethrows unrelated errors unchanged', async () => {
      const unrelatedError = new Error('connection lost');
      vi.mocked(prisma.plan.update).mockRejectedValue(unrelatedError);

      await expect(plansService.update(1, { price: 100 })).rejects.toThrow(unrelatedError);
    });
  });
});
