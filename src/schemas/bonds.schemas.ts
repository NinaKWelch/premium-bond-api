import { z } from 'zod';

const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'date must be in YYYY-MM format');

export const addTransactionSchema = z.object({
  date: yearMonthSchema,
  amount: z.number().positive('amount must be a positive number').max(50000, 'maximum holding is £50,000'),
  type: z.enum(['deposit', 'withdrawal', 'reinvestment']),
});

export const addPrizeSchema = z.object({
  date: yearMonthSchema,
  amount: z.number().positive('amount must be a positive number').max(1000000, 'maximum prize is £1,000,000'),
});

const transactionSchema = z.object({
  date: yearMonthSchema,
  amount: z.number().positive('amount must be a positive number'),
  type: z.enum(['deposit', 'withdrawal']),
});

const prizeSchema = z.object({
  date: yearMonthSchema,
  amount: z.number().positive('amount must be a positive number'),
});

// Used by the stateless POST /calculate endpoint (not currently exposed,
// kept for potential future use alongside the store-based GET /calculate).
export const calculateRequestSchema = z
  .object({
    transactions: z
      .array(transactionSchema)
      .min(1, 'at least one transaction is required')
      .refine(
        (txns) => txns.some((t) => t.type === 'deposit'),
        'at least one deposit is required'
      ),
    prizes: z.array(prizeSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.prizes.length === 0) return true;
      // ISO 8601 date strings (YYYY-MM-DD) sort correctly as plain strings
      const firstDepositDate = data.transactions
        .filter((t) => t.type === 'deposit')
        .map((t) => t.date)
        .sort()[0];
      return data.prizes.every((p) => p.date >= firstDepositDate);
    },
    { message: 'prize dates cannot be before the first deposit date' }
  );

export type CalculateRequest = z.infer<typeof calculateRequestSchema>;
