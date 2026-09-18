import { subscriptionSchema, type SubscriptionDto } from '@amp-csr/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{ include: { plan: true } }>;

export function toSubscriptionDto(subscription: SubscriptionWithPlan): SubscriptionDto {
  return subscriptionSchema.parse({
    ...subscription,
    nextBillingDate: subscription.nextBillingDate.toISOString(),
  });
}
