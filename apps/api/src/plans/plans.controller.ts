import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import type { PlanDto } from '@amp-csr/shared';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  findActive(): Promise<PlanDto[]> {
    return this.plansService.findActive();
  }
}
