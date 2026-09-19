import { z } from 'zod';
import {
  getPlansRequestSchema,
  planSchema,
  type CreatePlanDto,
  type GetPlansRequestDto,
  type PlanDto,
  type UpdatePlanDto,
} from '@amp-csr/shared';

import { apiUrl } from './apiUrl.js';

const plansResponseSchema = z.array(planSchema);

export async function getPlans(params: GetPlansRequestDto = {}): Promise<PlanDto[]> {
  const { includeDisabled } = getPlansRequestSchema.parse(params);
  const url = apiUrl('/plans');
  if (includeDisabled) url.searchParams.set('includeDisabled', 'true');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.status}`);
  }

  const body: unknown = await response.json();
  return plansResponseSchema.parse(body);
}

export async function createPlan(data: CreatePlanDto): Promise<PlanDto> {
  const url = apiUrl('/plans');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create plan: ${response.status}`);
  }

  const body: unknown = await response.json();
  return planSchema.parse(body);
}

export async function updatePlan(id: number, data: UpdatePlanDto): Promise<PlanDto> {
  const url = apiUrl(`/plans/${id}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update plan: ${response.status}`);
  }

  const body: unknown = await response.json();
  return planSchema.parse(body);
}
