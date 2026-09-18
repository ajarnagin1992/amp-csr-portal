import { z } from 'zod';
import { planSchema, type PlanDto } from '@amp-csr/shared';

import { apiUrl } from './apiUrl.js';

const plansResponseSchema = z.array(planSchema);

export async function getPlans(): Promise<PlanDto[]> {
  const url = apiUrl('/plans');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.status}`);
  }

  const body: unknown = await response.json();
  return plansResponseSchema.parse(body);
}
