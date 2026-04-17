import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('must be a valid email address'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('must be a valid email address'),
  password: z.string().min(1, 'password is required'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
