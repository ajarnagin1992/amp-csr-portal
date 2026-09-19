import type { SubscriptionStatus } from '../../generated/prisma/client.js';

// Every status is classified exactly once, so the live and terminal sets can never overlap, and
// adding a value to the SubscriptionStatus enum won't compile until it's classified here.
const STATUS_KIND = {
  ACTIVE: 'live',
  OVERDUE: 'live',
  CANCELLED: 'terminal',
  TRANSFERRED: 'terminal',
} as const satisfies Record<SubscriptionStatus, 'live' | 'terminal'>;

const statusesOfKind = (kind: 'live' | 'terminal') =>
  (Object.keys(STATUS_KIND) as SubscriptionStatus[]).filter((status) => STATUS_KIND[status] === kind);

export const TERMINAL_STATUSES_SUBSCRIPTION = new Set<SubscriptionStatus>(statusesOfKind('terminal'));

// Statuses covered by the partial unique index on subscriptions(vehicle_id) — a vehicle has at
// most one of these at a time. Keep in sync with the `where` on that @@unique in schema.prisma.
export const LIVE_STATUSES_SUBSCRIPTION: SubscriptionStatus[] = statusesOfKind('live');
