import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type MobileUser } from '../generated/prisma/client.js';
import { TERMINAL_STATUSES_SUBSCRIPTION } from '../common/constants/terminal-statuses.js';
import type { UpdateUserDto } from '@amp-csr/shared';
import type { PurchaseWithVehicle } from '../common/mappers/purchase.mapper.js';
import {
  purchaseDto,
  purchaseRow,
  userDetailDto,
  userDetailQueryRow,
  userDto,
  userRow,
  vehicleDto,
  vehicleRow,
} from '../test/fixtures.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: {
    mobileUser: {
      findMany: (args: { where?: object; skip: number; take: number }) => Promise<MobileUser[]>;
      count: (args?: { where?: object }) => Promise<number>;
      findUnique: (args: { where: { id: number }; include?: Prisma.MobileUserInclude }) => Promise<unknown>;
      update: (args: { where: { id: number }; data: UpdateUserDto }) => Promise<MobileUser>;
    };
    purchase: {
      findMany: (args: {
        where: { mobileUserId: number };
        orderBy?: object;
        include?: Prisma.PurchaseInclude;
      }) => Promise<PurchaseWithVehicle[]>;
    };
    subscription: {
      updateMany: (args: Prisma.SubscriptionUpdateManyArgs) => Promise<Prisma.BatchPayload>;
    };
    $transaction: (ops: unknown[]) => Promise<unknown[]>;
  };

  beforeEach(async () => {
    prisma = {
      mobileUser: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      purchase: {
        findMany: vi.fn(),
      },
      subscription: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    usersService = app.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns the page of users as MobileUserDtos alongside the total count', async () => {
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([userRow]);
      vi.mocked(prisma.mobileUser.count).mockResolvedValue(42);

      await expect(usersService.findAll(1, 20)).resolves.toEqual({ data: [userDto], total: 42 });
    });

    it('converts page/pageSize into the correct skip/take', async () => {
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

      await usersService.findAll(3, 10);

      expect(prisma.mobileUser.findMany).toHaveBeenCalledWith({ skip: 20, take: 10 });
    });

    it('requests skip 0 for the first page', async () => {
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

      await usersService.findAll(1, 20);

      expect(prisma.mobileUser.findMany).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });

    it('counts the total across all users, unfiltered by the page', async () => {
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

      await usersService.findAll(3, 10);

      expect(prisma.mobileUser.count).toHaveBeenCalledWith({ where: undefined });
    });

    describe('when a search term is provided', () => {
      it('filters by a case-insensitive match on first name, last name, email, or phone', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(1, 20, 'jane');

        const conditions: Prisma.MobileUserWhereInput[] = [
          { firstName: { contains: 'jane', mode: 'insensitive' } },
          { lastName: { contains: 'jane', mode: 'insensitive' } },
          { email: { contains: 'jane', mode: 'insensitive' } },
          { phone: { contains: 'jane', mode: 'insensitive' } },
        ];
        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ OR: expect.arrayContaining(conditions) }),
          }),
        );
      });

      it('also matches the license plate of a vehicle owned by the user', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(1, 20, 'abc123');

        const conditions: Prisma.MobileUserWhereInput[] = [
          { vehicles: { some: { licensePlate: { contains: 'abc123', mode: 'insensitive' } } } },
        ];
        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ OR: expect.arrayContaining(conditions) }),
          }),
        );
      });

      it('still applies skip/take for the requested page alongside the filter', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(2, 5, 'jane');

        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
      });

      it('passes the same filter to count, so total reflects the filtered results', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(1, 20, 'jane');

        const conditions: Prisma.MobileUserWhereInput[] = [{ firstName: { contains: 'jane', mode: 'insensitive' } }];
        expect(prisma.mobileUser.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ OR: expect.arrayContaining(conditions) }),
          }),
        );
      });

      it('treats an empty search string as no filter', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(1, 20, '');

        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith({ skip: 0, take: 20 });
        expect(prisma.mobileUser.count).toHaveBeenCalledWith({ where: undefined });
      });
    });
  });

  describe('findOne', () => {
    it('returns the user merged with their purchase history as a UserDetailDto', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue(userDetailQueryRow);
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([purchaseRow]);

      await expect(usersService.findOne(1)).resolves.toEqual(userDetailDto);
    });

    it('looks up the user by id, including their vehicles, subscription, and plan', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({ ...userRow, vehicles: [] });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await usersService.findOne(1);

      const include: Prisma.MobileUserInclude = {
        vehicles: {
          include: {
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { plan: true },
            },
          },
        },
      };
      expect(prisma.mobileUser.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include });
    });

    it('exposes the most recent subscription of each vehicle as a single object, not an array', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue(userDetailQueryRow);
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      const result = await usersService.findOne(1);

      expect(result.vehicles).toEqual([vehicleDto]);
    });

    it('exposes undefined when a vehicle has no subscription history', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({
        ...userRow,
        vehicles: [{ ...vehicleRow, subscriptions: [] }],
      });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      const result = await usersService.findOne(1);

      expect(result.vehicles).toEqual([{ ...vehicleDto, subscription: undefined }]);
    });

    it('maps the purchase history onto the purchase contract', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({ ...userRow, vehicles: [] });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([purchaseRow]);

      const result = await usersService.findOne(1);

      expect(result.purchases).toEqual([purchaseDto]);
    });

    it('fetches the purchase history for that user, most recent first, including the vehicle license plate', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({ ...userRow, vehicles: [] });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await usersService.findOne(1);

      const args: Prisma.PurchaseFindManyArgs = {
        where: { mobileUserId: 1 },
        orderBy: { createdAt: 'desc' },
        include: { vehicle: { select: { id: true, licensePlate: true } } },
      };
      expect(prisma.purchase.findMany).toHaveBeenCalledWith(args);
    });

    it('throws NotFoundException when no user exists with that id', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue(undefined);
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await expect(usersService.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the user and returns the updated record as a MobileUserDto', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue({ ...userRow, firstName: 'Janet' });

      await expect(usersService.update(1, { firstName: 'Janet' })).resolves.toEqual({
        ...userDto,
        firstName: 'Janet',
      });
    });

    it('passes the id and the partial data to Prisma', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue(userRow);

      await usersService.update(1, { firstName: 'Jane' });

      const data: Prisma.MobileUserUpdateInput = { firstName: 'Jane' };
      expect(prisma.mobileUser.update).toHaveBeenCalledWith({ where: { id: 1 }, data });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      vi.mocked(prisma.mobileUser.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.10.0' }),
      );

      await expect(usersService.update(999, { firstName: 'Jane' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the email is already in use', async () => {
      vi.mocked(prisma.mobileUser.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(usersService.update(1, { email: 'taken@example.com' })).rejects.toThrow(ConflictException);
    });

    it('rethrows unrelated errors unchanged', async () => {
      const unrelatedError = new Error('connection lost');
      vi.mocked(prisma.mobileUser.update).mockRejectedValue(unrelatedError);

      await expect(usersService.update(1, { firstName: 'Jane' })).rejects.toThrow(unrelatedError);
    });

    it('never touches subscriptions, since status is not an editable profile field', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue(userRow);

      await usersService.update(1, { firstName: 'Jane' });

      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('cancels every non-terminal subscription on the vehicles of the user', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 2 }, { ...userRow, status: 'DISABLED' }]);

      await usersService.deactivate(1);

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { vehicle: { mobileUserId: 1 }, status: { notIn: [...TERMINAL_STATUSES_SUBSCRIPTION] } },
        data: { status: 'CANCELLED' },
      });
    });

    it('updates the user status alongside the subscription cancellation', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 0 }, { ...userRow, status: 'DISABLED' }]);

      await usersService.deactivate(1);

      expect(prisma.mobileUser.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'DISABLED' } });
    });

    it('returns the updated user record as a MobileUserDto', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 0 }, { ...userRow, status: 'DISABLED' }]);

      await expect(usersService.deactivate(1)).resolves.toEqual({ ...userDto, status: 'DISABLED' });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.10.0' }),
      );

      await expect(usersService.deactivate(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('does not touch subscriptions', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue(userRow);

      await usersService.reactivate(1);

      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sets the user status to ACTIVE and returns the updated record as a MobileUserDto', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue({ ...userRow, status: 'ACTIVE' });

      await expect(usersService.reactivate(1)).resolves.toEqual({ ...userDto, status: 'ACTIVE' });
      expect(prisma.mobileUser.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'ACTIVE' } });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      vi.mocked(prisma.mobileUser.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '7.10.0' }),
      );

      await expect(usersService.reactivate(999)).rejects.toThrow(NotFoundException);
    });
  });
});
