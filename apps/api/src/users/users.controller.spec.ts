import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { MobileUser } from '../generated/prisma/client.js';
import type { UpdateUserDto } from '@amp-csr/shared';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: {
    findAll: (page: number, pageSize: number, search?: string) => Promise<{ data: MobileUser[]; total: number }>;
    findOne: (id: number) => Promise<unknown>;
    update: (id: number, dto: UpdateUserDto) => Promise<MobileUser>;
  };

  beforeEach(async () => {
    usersService = { findAll: vi.fn(), findOne: vi.fn(), update: vi.fn() };

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

      expect(usersService.findAll).toHaveBeenCalledWith(2, 5, undefined);
    });

    it('passes the search term through to the service', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue({ data: [], total: 0 });

      await usersController.findAll(1, 20, 'jane');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 20, 'jane');
    });
  });

  describe('findOne', () => {
    it('returns the user detail from the service', async () => {
      const detail = { id: 1, vehicles: [], purchases: [] };
      vi.mocked(usersService.findOne).mockResolvedValue(detail);

      await expect(usersController.findOne(1)).resolves.toBe(detail);
    });

    it('looks up the user by the id route param', async () => {
      vi.mocked(usersService.findOne).mockResolvedValue({ id: 1, vehicles: [], purchases: [] });

      await usersController.findOne(1);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('returns the updated user from the service', async () => {
      const updated = { id: 1, firstName: 'Jane' } as MobileUser;
      vi.mocked(usersService.update).mockResolvedValue(updated);

      await expect(usersController.update(1, { firstName: 'Jane' })).resolves.toBe(updated);
    });

    it('passes the id and the request body through to the service', async () => {
      vi.mocked(usersService.update).mockResolvedValue({} as MobileUser);

      await usersController.update(1, { firstName: 'Jane' });

      expect(usersService.update).toHaveBeenCalledWith(1, { firstName: 'Jane' });
    });
  });
});
