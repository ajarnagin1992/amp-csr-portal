import { Body, Controller, DefaultValuePipe, Get, Param, Patch, ParseIntPipe, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { MobileUser } from '../generated/prisma/client.js';
import { updateUserSchema, type UpdateUserDto } from '@amp-csr/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ): Promise<{ data: MobileUser[]; total: number }> {
    return this.usersService.findAll(page, pageSize, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ): Promise<MobileUser> {
    return this.usersService.update(id, dto);
  }
}
