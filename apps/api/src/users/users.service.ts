import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number): Promise<{ data: MobileUser[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.mobileUser.findMany({ skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.mobileUser.count(),
    ]);
    return { data, total };
  }
}
