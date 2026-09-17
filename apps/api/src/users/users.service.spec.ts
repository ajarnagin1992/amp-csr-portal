import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: { mobileUser: { findMany: () => Promise<MobileUser[]> } };

  beforeEach(async () => {
    prisma = { mobileUser: { findMany: vi.fn() } };

    const app: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    usersService = app.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns every mobile user from Prisma', async () => {
      const users = [{ id: 1 }, { id: 2 }] as MobileUser[];
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue(users);

      await expect(usersService.findAll()).resolves.toBe(users);
    });

    it('queries mobileUser.findMany with no filter, so it returns everyone', async () => {
      vi.mocked(prisma.mobileUser.findMany).mockResolvedValue([]);

      await usersService.findAll();

      expect(prisma.mobileUser.findMany).toHaveBeenCalledWith();
    });
  });
});
