import { planSchema, type PlanDto } from '@amp-csr/shared';
import type { Plan } from '../../generated/prisma/client.js';

export function toPlanDto(plan: Plan): PlanDto {
  return planSchema.parse(plan);
}
