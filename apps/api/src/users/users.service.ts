import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PRISMA_ERROR_CODE } from '../common/constants/prisma-error-codes.js';
import { TERMINAL_STATUSES_SUBSCRIPTION } from '../common/constants/terminal-statuses.js';
import type { ListUsersResponseDto, MobileUserDto, UpdateUserDto, UserDetailDto } from '@amp-csr/shared';
import { toMobileUserDto, toUserDetailDto } from '../common/mappers/mobile-user.mapper.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, search?: string): Promise<ListUsersResponseDto> {
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { vehicles: { some: { licensePlate: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.mobileUser.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.mobileUser.count({ where }),
    ]);
    return { data: data.map(toMobileUserDto), total };
  }

  async findOne(id: number): Promise<UserDetailDto> {
    const [user, purchases] = await Promise.all([
      this.prisma.mobileUser.findUnique({
        where: { id },
        include: {
          vehicles: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { plan: true },
              },
            },
          },
        },
      }),
      this.prisma.purchase.findMany({
        where: { mobileUserId: id },
        orderBy: { createdAt: 'desc' },
        include: { vehicle: { select: { id: true, licensePlate: true } } },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const vehicles = user.vehicles.map(({ subscriptions, ...vehicle }) => ({
      ...vehicle,
      subscription: subscriptions[0],
    }));

    return toUserDetailDto({ ...user, vehicles, purchases });
  }

  // Account details are frozen while an account is disabled: a disabled account is the
  // record of what it looked like when it was closed, and editing it would rewrite that.
  async update(id: number, data: UpdateUserDto): Promise<MobileUserDto> {
    const existing = await this.prisma.mobileUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (existing.status === 'DISABLED') {
      throw new ConflictException(`User ${id} is disabled; reactivate the account before editing it`);
    }

    try {
      return toMobileUserDto(await this.prisma.mobileUser.update({ where: { id }, data }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new NotFoundException(`User ${id} not found`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  // Deactivates the account and cancels every non-terminal subscription on the user's vehicles.
  async deactivate(id: number): Promise<MobileUserDto> {
    try {
      const [, user] = await this.prisma.$transaction([
        this.prisma.subscription.updateMany({
          where: {
            vehicle: { mobileUserId: id },
            status: { notIn: [...TERMINAL_STATUSES_SUBSCRIPTION] },
          },
          data: { status: 'CANCELLED' },
        }),
        this.prisma.mobileUser.update({ where: { id }, data: { status: 'DISABLED' } }),
      ]);
      return toMobileUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }

  async reactivate(id: number): Promise<MobileUserDto> {
    try {
      return toMobileUserDto(await this.prisma.mobileUser.update({ where: { id }, data: { status: 'ACTIVE' } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }
}
