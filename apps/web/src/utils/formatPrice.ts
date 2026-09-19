const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Prices are stored as whole cents.
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}
