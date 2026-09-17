import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, type MobileUser } from '../generated/prisma/client.js';
import { PRISMA_ERROR_CODE } from '../common/constants/prisma-error-codes.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, search?: string): Promise<{ data: MobileUser[]; total: number }> {
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
    return { data, total };
  }

  async findOne(id: number) {
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
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const vehicles = user.vehicles.map(({ subscriptions, ...vehicle }) => ({
      ...vehicle,
      subscription: subscriptions[0],
    }));

    return { ...user, vehicles, purchases };
  }

  async update(id: number, data: UpdateUserDto): Promise<MobileUser> {
    try {
      return await this.prisma.mobileUser.update({ where: { id }, data });
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
}
