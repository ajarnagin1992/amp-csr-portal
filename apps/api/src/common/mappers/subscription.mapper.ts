import type { SubscriptionDto } from '@amp-csr/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { toPlanDto } from './plan.mapper.js';

export type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{ include: { plan: true } }>;

export function toSubscriptionDto(subscription: SubscriptionWithPlan): SubscriptionDto {
  return {
    id: subscription.id,
    status: subscription.status,
    nextBillingDate: subscription.nextBillingDate.toISOString(),
    plan: toPlanDto(subscription.plan),
  };
}
