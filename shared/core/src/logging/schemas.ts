import { z } from 'zod';
import { logger } from '../utils/logger';

/**
 * Core event schemas for structured logging
 * 
 * These schemas define the structure and validation rules for
 * different types of events logged through the system.
 */

// Base event schema that all other events extend
const baseEventSchema = z.object({
  timestamp: z.date(),
  correlationId: z.string().optional(),
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
  module: z.string(),
  message: z.string()
});

// HTTP Request events
export const httpEventSchema = baseEventSchema.extend({
  type: z.literal('http'),
  data: z.object({
    method: z.string(),
    path: z.string(),
    statusCode: z.number(),
    duration: z.number(),
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    userId: z.string().optional()
  })
});

// Database operation events
export const dbEventSchema = baseEventSchema.extend({
  type: z.literal('database'),
  data: z.object({
    operation: z.string(),
    table: z.string(),
    duration: z.number(),
    success: z.boolean(),
    rowCount: z.number().optional(),
    error: z.string().optional()
  })
});

// Cache operation events
export const cacheEventSchema = baseEventSchema.extend({
  type: z.literal('cache'),
  data: z.object({
    operation: z.string(),
    key: z.string(),
    duration: z.number(),
    hit: z.boolean(),
    size: z.number().optional()
  })
});

// Security events
export const securityEventSchema = baseEventSchema.extend({
  type: z.literal('security'),
  data: z.object({
    action: z.string(),
    userId: z.string().optional(),
    resource: z.string().optional(),
    success: z.boolean(),
    reason: z.string().optional(),
    ip: z.string().optional()
  })
});

// Performance events
export const performanceEventSchema = baseEventSchema.extend({
  type: z.literal('performance'),
  data: z.object({
    metric: z.string(),
    value: z.number(),
    unit: z.string(),
    tags: z.record(z.string()).optional()
  })
});

// Error events
export const errorEventSchema = baseEventSchema.extend({
  type: z.literal('error'),
  data: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
    cause: z.unknown().optional()
  })
});

// Business events
export const businessEventSchema = baseEventSchema.extend({
  type: z.literal('business'),
  data: z.object({
    action: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    changes: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional()
  })
});

// Union of all event types
export const eventSchema = z.discriminatedUnion('type', [
  httpEventSchema,
  dbEventSchema,
  cacheEventSchema,
  securityEventSchema,
  performanceEventSchema,
  errorEventSchema,
  businessEventSchema
]);

// Type exports
export type Event = z.infer<typeof eventSchema>;
export type HttpEvent = z.infer<typeof httpEventSchema>;
export type DbEvent = z.infer<typeof dbEventSchema>;
export type CacheEvent = z.infer<typeof cacheEventSchema>;
export type SecurityEvent = z.infer<typeof securityEventSchema>;
export type PerformanceEvent = z.infer<typeof performanceEventSchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
export type BusinessEvent = z.infer<typeof businessEventSchema>;







