import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type MobileUser, type Purchase } from '../generated/prisma/client.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: {
    mobileUser: {
      findMany: (args: { where?: object; skip: number; take: number }) => Promise<MobileUser[]>;
      count: (args?: { where?: object }) => Promise<number>;
      findUnique: (args: { where: { id: number }; include?: object }) => Promise<unknown>;
      update: (args: { where: { id: number }; data: UpdateUserDto }) => Promise<MobileUser>;
    };
    purchase: {
      findMany: (args: { where: { mobileUserId: number }; orderBy?: object }) => Promise<Purchase[]>;
    };
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
    };

    const app: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    usersService = app.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns the page of users alongside the total count', async () => {
      const users = [{ id: 1 }, { id: 2 }] as MobileUser[];
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue(users);
      vi.mocked(prisma.mobileUser.count).mockResolvedValue(42);

      await expect(usersService.findAll(1, 20)).resolves.toEqual({ data: users, total: 42 });
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

        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { firstName: { contains: 'jane', mode: 'insensitive' } },
                { lastName: { contains: 'jane', mode: 'insensitive' } },
                { email: { contains: 'jane', mode: 'insensitive' } },
                { phone: { contains: 'jane', mode: 'insensitive' } },
              ]),
            }),
          }),
        );
      });

      it('also matches the license plate of a vehicle owned by the user', async () => {
        vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);
        vi.mocked(prisma.mobileUser.count).mockResolvedValue(0);

        await usersService.findAll(1, 20, 'abc123');

        expect(prisma.mobileUser.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { vehicles: { some: { licensePlate: { contains: 'abc123', mode: 'insensitive' } } } },
              ]),
            }),
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

        expect(prisma.mobileUser.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([{ firstName: { contains: 'jane', mode: 'insensitive' } }]),
            }),
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
    it('returns the user merged with their purchase history', async () => {
      const user = { id: 1, firstName: 'Jane', vehicles: [] } as unknown as MobileUser & { vehicles: unknown[] };
      const purchases = [{ id: 10 }, { id: 11 }] as Purchase[];
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue(user);
      vi.mocked(prisma.purchase.findMany).mockResolvedValue(purchases);

      await expect(usersService.findOne(1)).resolves.toEqual({ ...user, purchases });
    });

    it('looks up the user by id, including their vehicles, subscription, and plan', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({ id: 1, vehicles: [] });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await usersService.findOne(1);

      expect(prisma.mobileUser.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          vehicles: {
            include: {
              subscription: {
                include: { plan: true },
              },
            },
          },
        },
      });
    });

    it('fetches the purchase history for that user, most recent first', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue({ id: 1, vehicles: [] });
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await usersService.findOne(1);

      expect(prisma.purchase.findMany).toHaveBeenCalledWith({
        where: { mobileUserId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws NotFoundException when no user exists with that id', async () => {
      vi.mocked(prisma.mobileUser.findUnique).mockResolvedValue(undefined);
      vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);

      await expect(usersService.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the user and returns the updated record', async () => {
      const updated = { id: 1, firstName: 'Jane' } as MobileUser;
      vi.mocked(prisma.mobileUser.update).mockResolvedValue(updated);

      await expect(usersService.update(1, { firstName: 'Jane' })).resolves.toEqual(updated);
    });

    it('passes the id and the partial data to Prisma', async () => {
      vi.mocked(prisma.mobileUser.update).mockResolvedValue({} as MobileUser);

      await usersService.update(1, { firstName: 'Jane' });

      expect(prisma.mobileUser.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { firstName: 'Jane' } });
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
  });
});
