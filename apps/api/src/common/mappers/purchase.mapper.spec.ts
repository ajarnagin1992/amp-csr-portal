import { toPurchaseDto } from './purchase.mapper.js';
import { purchaseDto, purchaseRow } from '../../test/fixtures.js';

describe('toPurchaseDto', () => {
  it('maps a purchase row onto the purchase contract', () => {
    expect(toPurchaseDto(purchaseRow)).toEqual(purchaseDto);
  });

  it('serialises the creation date as an ISO string', () => {
    expect(toPurchaseDto(purchaseRow).createdAt).toBe('2026-01-15T00:00:00.000Z');
  });

  it('normalises the null subscription id of a one-off wash to undefined', () => {
    expect(toPurchaseDto(purchaseRow).subscriptionId).toBeUndefined();
  });

  it('keeps a subscription id when the purchase has one', () => {
    expect(toPurchaseDto({ ...purchaseRow, subscriptionId: 7 }).subscriptionId).toBe(7);
  });

  it('drops the owner id and vehicle foreign key that are not part of the contract', () => {
    const purchase = toPurchaseDto(purchaseRow);

    expect(purchase).not.toHaveProperty('mobileUserId');
    expect(purchase).not.toHaveProperty('vehicleId');
  });
});
