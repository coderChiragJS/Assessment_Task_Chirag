import { z } from 'zod';

const password = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128);

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().transform((e) => e.toLowerCase()),
  password,
});

export const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
