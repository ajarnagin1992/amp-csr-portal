import { Body, Controller, Delete, Get, Param, Patch, ParseIntPipe, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import {
  getUsersQuerySchema,
  updateUserSchema,
  type GetUsersQueryDto,
  type ListUsersResponseDto,
  type MobileUserDto,
  type UpdateUserDto,
  type UserDetailDto,
} from '@amp-csr/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query(new ZodValidationPipe(getUsersQuerySchema)) query: GetUsersQueryDto): Promise<ListUsersResponseDto> {
    return this.usersService.findAll(query.page, query.pageSize, query.search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDetailDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ): Promise<MobileUserDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number): Promise<MobileUserDto> {
    return this.usersService.deactivate(id);
  }

  @Post(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number): Promise<MobileUserDto> {
    return this.usersService.reactivate(id);
  }
}
