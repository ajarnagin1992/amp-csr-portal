import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: { findAll: () => Promise<MobileUser[]> };

  beforeEach(async () => {
    usersService = { findAll: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    usersController = app.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('returns the users from the service', async () => {
      const users = [{ id: 1 }] as MobileUser[];
      vi.mocked(usersService.findAll).mockResolvedValue(users);

      await expect(usersController.findAll()).resolves.toBe(users);
    });
  });
});
