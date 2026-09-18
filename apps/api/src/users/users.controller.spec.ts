import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { ListUsersResponseDto, MobileUserDto, UpdateUserDto, UserDetailDto } from '@amp-csr/shared';
import { userDetailDto, userDto } from '../test/fixtures.js';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: {
    findAll: (page: number, pageSize: number, search?: string) => Promise<ListUsersResponseDto>;
    findOne: (id: number) => Promise<UserDetailDto>;
    update: (id: number, dto: UpdateUserDto) => Promise<MobileUserDto>;
    deactivate: (id: number) => Promise<MobileUserDto>;
    reactivate: (id: number) => Promise<MobileUserDto>;
  };

  beforeEach(async () => {
    usersService = { findAll: vi.fn(), findOne: vi.fn(), update: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    usersController = app.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('returns the paginated result from the service', async () => {
      const result = { data: [userDto], total: 1 };
      vi.mocked(usersService.findAll).mockResolvedValue(result);

      await expect(usersController.findAll({ page: 1, pageSize: 20 })).resolves.toBe(result);
    });

    it('passes the requested page and pageSize through to the service', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue({ data: [], total: 0 });

      await usersController.findAll({ page: 2, pageSize: 5 });

      expect(usersService.findAll).toHaveBeenCalledWith(2, 5, undefined);
    });

    it('passes the search term through to the service', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue({ data: [], total: 0 });

      await usersController.findAll({ page: 1, pageSize: 20, search: 'jane' });

      expect(usersService.findAll).toHaveBeenCalledWith(1, 20, 'jane');
    });
  });

  describe('findOne', () => {
    it('returns the user detail from the service', async () => {
      vi.mocked(usersService.findOne).mockResolvedValue(userDetailDto);

      await expect(usersController.findOne(1)).resolves.toBe(userDetailDto);
    });

    it('looks up the user by the id route param', async () => {
      vi.mocked(usersService.findOne).mockResolvedValue(userDetailDto);

      await usersController.findOne(1);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('returns the updated user from the service', async () => {
      const updated = { ...userDto, firstName: 'Janet' };
      vi.mocked(usersService.update).mockResolvedValue(updated);

      await expect(usersController.update(1, { firstName: 'Janet' })).resolves.toBe(updated);
    });

    it('passes the id and the request body through to the service', async () => {
      vi.mocked(usersService.update).mockResolvedValue(userDto);

      await usersController.update(1, { firstName: 'Jane' });

      expect(usersService.update).toHaveBeenCalledWith(1, { firstName: 'Jane' });
    });
  });

  describe('deactivate', () => {
    it('returns the deactivated user from the service', async () => {
      const deactivated = { ...userDto, status: 'DISABLED' } as const;
      vi.mocked(usersService.deactivate).mockResolvedValue(deactivated);

      await expect(usersController.deactivate(1)).resolves.toBe(deactivated);
    });

    it('passes the id from the route through to the service', async () => {
      vi.mocked(usersService.deactivate).mockResolvedValue(userDto);

      await usersController.deactivate(1);

      expect(usersService.deactivate).toHaveBeenCalledWith(1);
      expect(usersService.reactivate).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('returns the reactivated user from the service', async () => {
      const reactivated = { ...userDto, status: 'ACTIVE' } as const;
      vi.mocked(usersService.reactivate).mockResolvedValue(reactivated);

      await expect(usersController.reactivate(1)).resolves.toBe(reactivated);
    });

    it('passes the id from the route through to the service', async () => {
      vi.mocked(usersService.reactivate).mockResolvedValue(userDto);

      await usersController.reactivate(1);

      expect(usersService.reactivate).toHaveBeenCalledWith(1);
      expect(usersService.deactivate).not.toHaveBeenCalled();
    });
  });
});
