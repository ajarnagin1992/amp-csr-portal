import { Body, Controller, Delete, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  createSubscriptionSchema,
  type CreateSubscriptionDto,
  type SubscriptionDto,
  transferSubscriptionSchema,
  type TransferSubscriptionDto,
} from '@amp-csr/shared';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createSubscriptionSchema)) dto: CreateSubscriptionDto): Promise<SubscriptionDto> {
    return this.subscriptionsService.create(dto.vehicleId, dto.planId);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number): Promise<SubscriptionDto> {
    return this.subscriptionsService.cancel(id);
  }

  @Post(':id/transfer')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(transferSubscriptionSchema)) dto: TransferSubscriptionDto,
  ): Promise<SubscriptionDto> {
    return this.subscriptionsService.transfer(id, dto.vehicleId);
  }
}
