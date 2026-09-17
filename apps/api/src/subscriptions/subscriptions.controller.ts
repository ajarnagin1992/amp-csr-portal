import { Body, Controller, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createSubscriptionSchema, type CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { updateSubscriptionSchema, type UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import type { Subscription } from '../generated/prisma/client.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createSubscriptionSchema)) dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionsService.create(dto.vehicleId, dto.planId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateSubscriptionSchema)) dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    return dto.transferVehicleId !== undefined
      ? this.subscriptionsService.transfer(id, dto.transferVehicleId)
      : this.subscriptionsService.cancel(id);
  }
}
