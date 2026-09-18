import { purchaseSchema } from './purchase.schema.js';

const validPurchase = {
  id: 100,
  type: 'SUBSCRIPTION',
  status: 'SUCCESS',
  amount: 29.99,
  description: 'Monthly subscription charge',
  createdAt: '2026-01-01T00:00:00.000Z',
  subscriptionId: 10,
  vehicle: {
    id: 5,
    licensePlate: 'ABC1234',
  },
};

describe('purchaseSchema', () => {
  it('accepts a valid purchase', () => {
    expect(purchaseSchema.safeParse(validPurchase).success).toBe(true);
  });

  it.each(['SUBSCRIPTION', 'SINGLE_WASH'])('accepts the %s type', (type) => {
    expect(purchaseSchema.safeParse({ ...validPurchase, type }).success).toBe(true);
  });

  it.each(['SUCCESS', 'FAILURE', 'REFUNDED'])('accepts the %s status', (status) => {
    expect(purchaseSchema.safeParse({ ...validPurchase, status }).success).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, type: 'DETAILING' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, status: 'PENDING' }).success).toBe(false);
  });

  it('keeps a subscriptionId that is provided', () => {
    const result = purchaseSchema.parse(validPurchase);
    expect(result.subscriptionId).toBe(10);
  });

  it('normalizes a null subscriptionId to undefined', () => {
    const result = purchaseSchema.parse({ ...validPurchase, subscriptionId: null });
    expect(result.subscriptionId).toBeUndefined();
  });

  it('leaves subscriptionId undefined when omitted, as for a single wash', () => {
    const { subscriptionId, ...rest } = validPurchase;
    const result = purchaseSchema.parse({ ...rest, type: 'SINGLE_WASH' });
    expect(result.subscriptionId).toBeUndefined();
  });

  it('rejects a subscriptionId that is not a number', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, subscriptionId: '10' }).success).toBe(false);
  });

  it('rejects a createdAt that is not a datetime', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, createdAt: 'not-a-date' }).success).toBe(false);
  });

  it('rejects a date-only createdAt', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, createdAt: '2026-01-01' }).success).toBe(false);
  });

  it('accepts a negative amount for a refund', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, amount: -29.99, status: 'REFUNDED' }).success).toBe(true);
  });

  it('rejects a missing vehicle', () => {
    const { vehicle, ...rest } = validPurchase;
    expect(purchaseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a vehicle missing its licensePlate', () => {
    expect(purchaseSchema.safeParse({ ...validPurchase, vehicle: { id: 5 } }).success).toBe(false);
  });
});
