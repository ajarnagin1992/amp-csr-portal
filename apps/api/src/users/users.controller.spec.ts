import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: {
    findAll: (page: number, pageSize: number) => Promise<{ data: MobileUser[]; total: number }>;
  };

  beforeEach(async () => {
    usersService = { findAll: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    usersController = app.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('returns the paginated result from the service', async () => {
      const result = { data: [{ id: 1 }] as MobileUser[], total: 1 };
      vi.mocked(usersService.findAll).mockResolvedValue(result);

      await expect(usersController.findAll(1, 20)).resolves.toBe(result);
    });

    it('passes the requested page and pageSize through to the service', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue({ data: [], total: 0 });

      await usersController.findAll(2, 5);

      expect(usersService.findAll).toHaveBeenCalledWith(2, 5);
    });
  });
});
