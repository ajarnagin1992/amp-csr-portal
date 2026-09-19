import { PLANS, USER_COUNT, buildUsers, type PlanRef, type SubscriptionSpec, type UserSpec } from './seed-data.js';

const DAY = 24 * 60 * 60 * 1000;

const plans: PlanRef[] = PLANS.map((plan, index) => ({ id: index + 1, ...plan }));
const NOW = new Date('2026-09-19T12:00:00Z');

const subscriptionsOf = (users: UserSpec[]) =>
  users.flatMap((user) => user.vehicles.flatMap((vehicle) => (vehicle.subscription ? [{ user, vehicle, sub: vehicle.subscription }] : [])));

const isLive = (sub: SubscriptionSpec) => sub.status === 'ACTIVE' || sub.status === 'OVERDUE';

// Dates around month ends, year ends, and a leap day, to catch calendar edge cases.
const DATES = [
  NOW,
  '2026-01-01T00:30:00Z',
  '2026-01-31T23:59:00Z',
  '2026-02-28T12:00:00Z',
  '2026-03-01T08:00:00Z',
  '2026-03-31T12:00:00Z',
  '2028-02-29T12:00:00Z',
  '2026-12-31T12:00:00Z',
].map((date) => new Date(date));

describe('seed data', () => {
  it('builds every user, each with a unique email', () => {
    const users = buildUsers(plans, NOW);
    expect(users).toHaveLength(USER_COUNT);
    expect(new Set(users.map((user) => user.email)).size).toBe(USER_COUNT);
  });

  it('is deterministic for a given date', () => {
    expect(buildUsers(plans, NOW)).toEqual(buildUsers(plans, NOW));
  });

  it('covers every scenario the portal needs to show', () => {
    const users = buildUsers(plans, NOW);
    const subs = subscriptionsOf(users);
    const statuses = new Set(subs.map(({ sub }) => sub.status));

    expect(statuses).toEqual(new Set(['ACTIVE', 'OVERDUE', 'CANCELLED', 'TRANSFERRED']));
    expect(users.some((user) => user.status === 'DISABLED' && user.vehicles.length > 0)).toBe(true);
    expect(users.some((user) => user.vehicles.length === 0)).toBe(true);
    expect(users.some((user) => user.vehicles.some((vehicle) => !vehicle.subscription))).toBe(true);
    // the retired plan still has members
    expect(subs.some(({ sub }) => sub.planId === plans.find((plan) => plan.status === 'DISABLED')?.id)).toBe(true);
  });

  describe.each(DATES.map((date) => [date.toISOString(), date] as const))('as of %s', (_label, now) => {
    const users = buildUsers(plans, now);
    const subs = subscriptionsOf(users);

    it('never records anything in the future', () => {
      for (const { sub, vehicle, user } of subs) {
        expect(sub.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(sub.lastUpdated.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(vehicle.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(user.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        for (const charge of sub.charges) expect(charge.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      }
      for (const user of users) {
        for (const vehicle of user.vehicles) {
          for (const wash of vehicle.singleWashes) expect(wash.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        }
      }
    });

    it('creates users before their vehicles, and vehicles before anything happens on them', () => {
      for (const user of users) {
        for (const vehicle of user.vehicles) {
          expect(user.createdAt.getTime()).toBeLessThan(vehicle.createdAt.getTime());
          const events = [
            ...(vehicle.subscription ? [vehicle.subscription.createdAt, ...vehicle.subscription.charges.map((c) => c.createdAt)] : []),
            ...vehicle.singleWashes.map((wash) => wash.createdAt),
          ];
          for (const event of events) expect(vehicle.createdAt.getTime()).toBeLessThan(event.getTime());
        }
      }
    });

    it('bills every subscription on its billing date and a month apart, never before it started', () => {
      for (const { sub } of subs) {
        expect(sub.charges.length).toBeGreaterThan(0);
        expect(sub.charges[0].createdAt.getTime()).toBeGreaterThanOrEqual(sub.createdAt.getTime());
        sub.charges.forEach((charge, i) => {
          if (i === 0) return;
          const gap = (charge.createdAt.getTime() - sub.charges[i - 1].createdAt.getTime()) / DAY;
          expect(gap).toBeGreaterThan(27.9);
          expect(gap).toBeLessThan(31.1);
        });
      }
    });

    it('starts each base subscription with a charge on the day it was created', () => {
      const transferTargets = new Set(
        subs.filter(({ sub }) => sub.status === 'TRANSFERRED').map(({ sub }) => sub.lastUpdated.getTime()),
      );
      for (const { sub } of subs.filter(({ sub }) => !transferTargets.has(sub.createdAt.getTime()))) {
        const delay = sub.charges[0].createdAt.getTime() - sub.createdAt.getTime();
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThan(60 * 60 * 1000);
      }
    });

    it('points a live subscription at a billing date in the future, after everything already charged', () => {
      for (const { sub } of subs.filter(({ sub }) => isLive(sub))) {
        expect(sub.nextBillingDate.getTime()).toBeGreaterThan(now.getTime());
        expect(sub.nextBillingDate.getTime()).toBeGreaterThan(sub.charges.at(-1)!.createdAt.getTime());
        expect(sub.lastUpdated.getTime()).toBe(sub.charges.at(-1)!.createdAt.getTime());
      }
    });

    it('ends a cancelled or transferred subscription after its last charge, with nothing billed after', () => {
      for (const { sub } of subs.filter(({ sub }) => !isLive(sub))) {
        const lastCharge = sub.charges.at(-1)!.createdAt.getTime();
        expect(sub.lastUpdated.getTime()).toBeGreaterThanOrEqual(lastCharge);
        expect(sub.nextBillingDate.getTime()).toBeGreaterThan(lastCharge);
      }
    });

    it('has an overdue subscription exactly when its latest charge failed', () => {
      for (const { sub } of subs.filter(({ sub }) => isLive(sub))) {
        const latest = sub.charges.at(-1)!;
        expect(latest.status).toBe(sub.status === 'OVERDUE' ? 'FAILURE' : 'SUCCESS');
      }
    });

    it('gives a vehicle at most one live subscription', () => {
      for (const user of users) {
        for (const vehicle of user.vehicles) {
          expect(vehicle.subscription && isLive(vehicle.subscription) ? 1 : 0).toBeLessThanOrEqual(1);
        }
      }
    });

    it('leaves a deactivated account with nothing live and nothing happening after it was deactivated', () => {
      const disabled = users.filter((user) => user.status === 'DISABLED');
      expect(disabled.length).toBeGreaterThan(0);

      for (const user of disabled) {
        const deactivatedAt = user.lastUpdated.getTime();
        expect(deactivatedAt).toBeLessThan(now.getTime());
        expect(deactivatedAt).toBeGreaterThan(user.createdAt.getTime());
        for (const vehicle of user.vehicles) {
          if (vehicle.subscription) {
            expect(isLive(vehicle.subscription)).toBe(false);
            expect(vehicle.subscription.lastUpdated.getTime()).toBeLessThanOrEqual(deactivatedAt);
            expect(vehicle.subscription.createdAt.getTime()).toBeLessThan(deactivatedAt);
            for (const charge of vehicle.subscription.charges) expect(charge.createdAt.getTime()).toBeLessThanOrEqual(deactivatedAt);
          }
          for (const wash of vehicle.singleWashes) expect(wash.createdAt.getTime()).toBeLessThanOrEqual(deactivatedAt);
        }
      }
    });

    it('only leaves live subscriptions on active accounts', () => {
      for (const { user, sub } of subs) {
        if (isLive(sub)) expect(user.status).toBe('ACTIVE');
      }
    });

    it('never has a single wash on a vehicle while a subscription covers it', () => {
      for (const user of users) {
        for (const vehicle of user.vehicles) {
          const sub = vehicle.subscription;
          if (!sub) continue;
          const coveredUntil = isLive(sub) ? Infinity : sub.lastUpdated.getTime();
          for (const wash of vehicle.singleWashes) {
            const at = wash.createdAt.getTime();
            expect(at < sub.createdAt.getTime() || at > coveredUntil).toBe(true);
          }
        }
      }
    });

    it('moves a transferred subscription to another vehicle of the same customer, on the same plan', () => {
      for (const user of users) {
        for (const vehicle of user.vehicles) {
          const source = vehicle.subscription;
          if (source?.status !== 'TRANSFERRED') continue;

          const target = user.vehicles.find(
            (other) => other !== vehicle && other.subscription?.createdAt.getTime() === source.lastUpdated.getTime(),
          )?.subscription;
          expect(target).toBeDefined();
          expect(target!.planId).toBe(source.planId);
          // it carries on the same billing schedule
          expect(target!.charges[0].createdAt.getTime()).toBeGreaterThan(source.charges.at(-1)!.createdAt.getTime());
        }
      }
    });
  });
});
