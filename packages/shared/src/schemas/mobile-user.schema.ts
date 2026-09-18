import { z } from 'zod';

export const mobileUserStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

export const mobileUserSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: z.string(),
  status: mobileUserStatusSchema,
  createdAt: z.iso.datetime(),
  lastUpdated: z.iso.datetime(),
});

export type MobileUserDto = z.infer<typeof mobileUserSchema>;


