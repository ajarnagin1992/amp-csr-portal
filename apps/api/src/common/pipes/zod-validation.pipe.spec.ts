import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1) });
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed value when validation succeeds', () => {
    expect(pipe.transform({ name: 'Jane' })).toEqual({ name: 'Jane' });
  });

  it('throws BadRequestException when validation fails', () => {
    expect(() => pipe.transform({ name: '' })).toThrow(BadRequestException);
  });
});
