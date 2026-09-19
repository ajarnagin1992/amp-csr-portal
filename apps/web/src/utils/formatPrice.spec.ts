import { formatPrice } from './formatPrice.js';

describe('formatPrice', () => {
  it('formats whole cents as US dollars', () => {
    expect(formatPrice(2999)).toBe('$29.99');
  });

  it('keeps trailing zeros', () => {
    expect(formatPrice(900)).toBe('$9.00');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('adds thousands separators', () => {
    expect(formatPrice(123456)).toBe('$1,234.56');
  });
});
