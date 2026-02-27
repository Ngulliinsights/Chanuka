/**
 * Alert Preference Domain Service
 * 
 * Handles business logic for alert preferences including:
 * - CRUD operations
 * - Smart filtering
 * - Delivery orchestration
 * - Analytics
 */

import { logger } from '@server/infrastructure/observability';
import { cacheService } from '@server/infrastructure/cache';
import { db } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailSchema } from '@shared/validation';

import type {
  AlertPreference,
  AlertType,
  ChannelType,
  Priority,
  DeliveryStatus,
  AlertDeliveryLog,
  SmartFilteringResult,
  AlertChannel,
  AlertConditions
} from '../entities/alert-preference';
import { AlertPreferenceEntity } from '../entities/alert-preference';
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
import { userPreferencesService } from '@server/features/users/domain/user-preferences';

// Type augmentation for schema.users.preferences
interface UserPreferencesData {
  alertPreferences?: AlertPreference[];
  deliveryLogs?: AlertDeliveryLog[];
  [key: string]: unknown;
}

function isUserPreferencesData(data: unknown): data is UserPreferencesData {
  if (!data || typeof data !== 'object') return false;
  return true;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const alertChannelSchema = z.object({
  type: z.enum(['in_app', 'email', 'push', 'sms', 'webhook']),
  enabled: z.boolean(),
  config: z.object({
    email: emailSchema.optional(),
    pushToken: z.string().optional(),
    phone_number: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    verified: z.boolean().default(false)
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
});

const alertConditionsSchema = z.object({
  billCategories: z.array(z.string()).optional(),
  billStatuses: z.array(z.string()).optional(),
  sponsor_ids: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  minimumEngagement: z.number().min(0).optional(),
  user_roles: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }).optional(),
  dayOfWeek: z.array(z.number().min(0).max(6)).optional()
});

export const alertPreferenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
  alertTypes: z.array(z.object({
    type: z.enum(['bill_status_change', 'new_comment', 'amendment', 'voting_scheduled', 'sponsor_update', 'engagement_milestone']),
    enabled: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    conditions: alertConditionsSchema.optional()
  })).min(1),
  channels: z.array(alertChannelSchema).min(1),
  frequency: z.object({
    type: z.enum(['immediate', 'batched']),
    batchInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
    batchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    batchDay: z.number().min(0).max(6).optional()
  }).refine(data => {
    if (data.type === 'batched' && !data.batchInterval) {
      return false;
    }
    return true;
  }, { message: "Batched frequency requires batchInterval" }),
  smartFiltering: z.object({
    enabled: z.boolean(),
    user_interestWeight: z.number().min(0).max(1),
    engagementHistoryWeight: z.number().min(0).max(1),
    trendingWeight: z.number().min(0).max(1),
    duplicateFiltering: z.boolean(),
    spamFiltering: z.boolean(),
    minimumConfidence: z.number().min(0).max(1).default(0.3)
  })
});
