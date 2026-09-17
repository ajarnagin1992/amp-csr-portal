import { getUsersQuerySchema } from './get-users-query.schema.js';

describe('getUsersQuerySchema', () => {
  it('defaults page to 1 and pageSize to 20 when omitted', () => {
    const result = getUsersQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces page and pageSize from query string values', () => {
    const result = getUsersQuerySchema.parse({ page: '2', pageSize: '5' });
    expect(result).toEqual({ page: 2, pageSize: 5 });
  });

  it('accepts an optional search term', () => {
    const result = getUsersQuerySchema.parse({ search: 'jane' });
    expect(result.search).toBe('jane');
  });

  it('rejects a non-integer page', () => {
    expect(getUsersQuerySchema.safeParse({ page: '1.5' }).success).toBe(false);
  });

  it('rejects a zero or negative page', () => {
    expect(getUsersQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects a zero or negative pageSize', () => {
    expect(getUsersQuerySchema.safeParse({ pageSize: '-1' }).success).toBe(false);
  });
});
