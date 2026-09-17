import { formatDate } from './formatDate.js';

describe('formatDate', () => {
  it('formats an ISO UTC datetime as a medium-length localized date', () => {
    expect(formatDate('2026-02-01T00:00:00.000Z')).toBe('Feb 1, 2026');
  });

  it('formats a different date correctly', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toBe('Jan 15, 2026');
  });

  it('returns a placeholder for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns a placeholder for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});
