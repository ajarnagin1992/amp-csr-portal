import type { SubscriptionStatus } from '../../generated/prisma/client.js';

export const TERMINAL_STATUSES_SUBSCRIPTION = new Set<SubscriptionStatus>(['CANCELLED', 'TRANSFERRED']);
