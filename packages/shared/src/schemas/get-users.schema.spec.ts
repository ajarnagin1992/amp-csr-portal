import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  getUsersRequestSchema,
  getUsersQuerySchema,
  getUsersResponseSchema,
} from './get-users.schema.js';

const validUser = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

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

describe('getUsersParamsSchema', () => {
  it('leaves page and pageSize undefined when omitted so the server applies the defaults', () => {
    const result = getUsersRequestSchema.parse({});
    expect(result).toEqual({});
  });

  it('keeps explicitly provided page, pageSize, and search', () => {
    const result = getUsersRequestSchema.parse({ page: 2, pageSize: 5, search: 'jane' });
    expect(result).toEqual({ page: 2, pageSize: 5, search: 'jane' });
  });

  it('rejects a non-integer page', () => {
    expect(getUsersRequestSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it('rejects a zero or negative page', () => {
    expect(getUsersRequestSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects a zero or negative pageSize', () => {
    expect(getUsersRequestSchema.safeParse({ pageSize: -1 }).success).toBe(false);
  });

  it('rejects a page that is not a number at all', () => {
    expect(getUsersRequestSchema.safeParse({ page: 'banana' }).success).toBe(false);
  });
});

describe('pagination defaults', () => {
  it('fills the query in with DEFAULT_PAGE and DEFAULT_PAGE_SIZE when they are omitted', () => {
    expect(getUsersQuerySchema.parse({})).toEqual({
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });
});

describe('getUsersResponseSchema', () => {
  it('accepts a valid paginated response', () => {
    expect(getUsersResponseSchema.safeParse({ data: [validUser], total: 1 }).success).toBe(true);
  });

  it('accepts an empty data array', () => {
    expect(getUsersResponseSchema.safeParse({ data: [], total: 0 }).success).toBe(true);
  });

  it('rejects a negative total', () => {
    expect(getUsersResponseSchema.safeParse({ data: [], total: -1 }).success).toBe(false);
  });

  it('rejects a non-array data field', () => {
    expect(getUsersResponseSchema.safeParse({ data: validUser, total: 1 }).success).toBe(false);
  });

  it('rejects a response containing an invalid user', () => {
    expect(getUsersResponseSchema.safeParse({ data: [{ ...validUser, status: 'BOGUS' }], total: 1 }).success).toBe(
      false,
    );
  });
});
