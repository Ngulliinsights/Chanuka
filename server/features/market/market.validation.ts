import { z } from 'zod';

export const AddPriceSchema = z.object({
  productId: z.string().uuid('Invalid commodity ID'),
  price: z.number().positive('Price must be greater than zero'),
  currency: z.string().length(3).openapi({ example: 'KES' }),
  location: z.string().optional(),
});

export type AddPricePayload = z.infer<typeof AddPriceSchema>;

export const GetMetricsSchema = z.object({
  productId: z.string().uuid('Invalid commodity ID'),
});

export const GetHistorySchema = z.object({
  productId: z.string().uuid('Invalid commodity ID'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
