import { toSubscriptionDto } from './subscription.mapper.js';
import { subscriptionDto, subscriptionRow } from '../../test/fixtures.js';

describe('toSubscriptionDto', () => {
  it('maps a subscription row onto the subscription contract', () => {
    expect(toSubscriptionDto(subscriptionRow)).toEqual(subscriptionDto);
  });

  it('serialises the billing date as an ISO string', () => {
    expect(toSubscriptionDto(subscriptionRow).nextBillingDate).toBe('2026-02-01T00:00:00.000Z');
  });

  it('drops the foreign keys and timestamps that are not part of the contract', () => {
    const subscription = toSubscriptionDto(subscriptionRow);

    expect(subscription).not.toHaveProperty('vehicleId');
    expect(subscription).not.toHaveProperty('planId');
    expect(subscription).not.toHaveProperty('createdAt');
    expect(subscription).not.toHaveProperty('lastUpdated');
  });

  it('nests the plan through the plan contract', () => {
    expect(toSubscriptionDto(subscriptionRow).plan).toEqual(subscriptionDto.plan);
  });
});
