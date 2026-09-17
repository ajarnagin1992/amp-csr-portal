import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { MobileUser } from '../generated/prisma/client.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<MobileUser[]> {
    return this.usersService.findAll();
  }
}
