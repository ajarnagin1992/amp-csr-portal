import { getPlansQuerySchema, getPlansRequestSchema } from './get-plans.schema.js';

describe('getPlansRequestSchema', () => {
  it('accepts no params', () => {
    expect(getPlansRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts includeDisabled as a boolean', () => {
    expect(getPlansRequestSchema.safeParse({ includeDisabled: true }).success).toBe(true);
  });
});

describe('getPlansQuerySchema', () => {
  it('defaults includeDisabled to false when the param is absent', () => {
    const result = getPlansQuerySchema.safeParse({});
    expect(result.success && result.data.includeDisabled).toBe(false);
  });

  it('parses "true" to true', () => {
    const result = getPlansQuerySchema.safeParse({ includeDisabled: 'true' });
    expect(result.success && result.data.includeDisabled).toBe(true);
  });

  it('parses "false" to false', () => {
    const result = getPlansQuerySchema.safeParse({ includeDisabled: 'false' });
    expect(result.success && result.data.includeDisabled).toBe(false);
  });

  it('rejects any other value', () => {
    expect(getPlansQuerySchema.safeParse({ includeDisabled: 'yes' }).success).toBe(false);
  });
});
