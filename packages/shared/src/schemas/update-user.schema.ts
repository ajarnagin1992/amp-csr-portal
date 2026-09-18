import { z } from 'zod';

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
