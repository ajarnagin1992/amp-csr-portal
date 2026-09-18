import { z } from 'zod';
import { planSchema, type PlanDto } from '@amp-csr/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const plansResponseSchema = z.array(planSchema);

export async function getPlans(): Promise<PlanDto[]> {
  const url = new URL('/plans', API_BASE_URL);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.status}`);
  }

  const body: unknown = await response.json();
  return plansResponseSchema.parse(body);
}
