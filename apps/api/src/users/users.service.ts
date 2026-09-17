import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

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
}
