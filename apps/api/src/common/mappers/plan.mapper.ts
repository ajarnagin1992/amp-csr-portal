import type { PlanDto } from '@amp-csr/shared';
import type { Plan } from '../../generated/prisma/client.js';

export function toPlanDto(plan: Plan): PlanDto {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    status: plan.status,
  };
}
