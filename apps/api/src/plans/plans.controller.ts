import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import type { Plan } from '../generated/prisma/client.js';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  findActive(): Promise<Plan[]> {
    return this.plansService.findActive();
  }
}
