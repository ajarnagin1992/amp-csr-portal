import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import {
  createPlanSchema,
  getPlansQuerySchema,
  updatePlanSchema,
  type CreatePlanDto,
  type GetPlansQueryDto,
  type PlanDto,
  type UpdatePlanDto,
} from '@amp-csr/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Active plans only by default — that's what the subscription picker wants.
  // The plan editor passes ?includeDisabled=true to see everything.
  @Get()
  find(@Query(new ZodValidationPipe(getPlansQuerySchema)) query: GetPlansQueryDto): Promise<PlanDto[]> {
    return query.includeDisabled ? this.plansService.findAll() : this.plansService.findActive();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPlanSchema)) dto: CreatePlanDto): Promise<PlanDto> {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePlanSchema)) dto: UpdatePlanDto,
  ): Promise<PlanDto> {
    return this.plansService.update(id, dto);
  }
}
