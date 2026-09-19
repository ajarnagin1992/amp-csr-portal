import { z } from 'zod';

export const csrUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
});

export type CsrUserDto = z.infer<typeof csrUserSchema>;
