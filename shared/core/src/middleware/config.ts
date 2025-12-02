import { z } from 'zod';
// import { logger } from '../observability/logging'; // Unused import

const middlewareFeatureSchema = z.object({
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  config: z.record(z.any()).optional()
});

export const middlewareConfigSchema = z.object({
  logging: middlewareFeatureSchema.extend({
    priority: z.number().default(10)
  }),
  auth: middlewareFeatureSchema.extend({
    priority: z.number().default(20)
  }),
  cache: middlewareFeatureSchema.extend({
    priority: z.number().default(30)
  }),
  validation: middlewareFeatureSchema.extend({
    priority: z.number().default(40)
  }),
  rateLimit: middlewareFeatureSchema.extend({
    priority: z.number().default(50)
  }),
  health: middlewareFeatureSchema.extend({
    priority: z.number().default(60),
    config: z.object({
      endpoint: z.string().default('/health'),
      includeSystemMetrics: z.boolean().default(true)
    }).optional()
  }),
  errorHandler: middlewareFeatureSchema.extend({
    priority: z.number().default(90)
  }),
  
  global: z.object({
    enableLegacyMode: z.boolean().default(false),
    enableDeprecationWarnings: z.boolean().default(true),
    performanceMonitoring: z.boolean().default(false)
  }).default({})
});

export type MiddlewareConfig = z.infer<typeof middlewareConfigSchema>;
















































