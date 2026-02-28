/**
 * USSD (Universal Access) Feature - Validation Schemas
 * 
 * Zod schemas for validating USSD session and interaction inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// USSD Session and State Enums
// ============================================================================

export const SessionStatusSchema = z.enum([
  'active',
  'completed',
  'timeout',
  'cancelled',
  'error'
]);

export const MenuStateSchema = z.enum([
  'main_menu',
  'bill_search',
  'bill_details',
  'voting_info',
  'representative_info',
  'notifications',
  'settings',
  'help'
]);

export const LanguageSchema = z.enum([
  'en',
  'es',
  'fr',
  'sw',
  'ar',
  'zh',
  'hi'
]);

export const AccessibilityModeSchema = z.enum([
  'standard',
  'simplified',
  'audio_description',
  'high_contrast'
]);

// ============================================================================
// Session Management Schemas
// ============================================================================

export const CreateSessionSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  service_code: z.string().max(20),
  network_code: z.string().max(20).optional(),
  language: LanguageSchema.default('en'),
  accessibility_mode: AccessibilityModeSchema.default('standard'),
});

export const UpdateSessionSchema = z.object({
  session_id: CommonSchemas.id,
  current_state: MenuStateSchema,
  user_input: z.string().max(160), // SMS length limit
  metadata: z.record(z.any()).optional(),
});

export const EndSessionSchema = z.object({
  session_id: CommonSchemas.id,
  reason: z.enum(['completed', 'timeout', 'user_cancelled', 'error']),
  final_state: MenuStateSchema.optional(),
});

// ============================================================================
// Menu Navigation Schemas
// ============================================================================

export const GetMenuSchema = z.object({
  session_id: CommonSchemas.id,
  menu_state: MenuStateSchema,
  language: LanguageSchema.default('en'),
  context: z.record(z.any()).optional(),
});

export const ProcessInputSchema = z.object({
  session_id: CommonSchemas.id,
  user_input: z.string().max(160),
  current_state: MenuStateSchema,
  timestamp: z.string().datetime().optional(),
});

export const NavigateMenuSchema = z.object({
  session_id: CommonSchemas.id,
  from_state: MenuStateSchema,
  to_state: MenuStateSchema,
  user_input: z.string().max(160).optional(),
});

// ============================================================================
// Content Delivery Schemas
// ============================================================================

export const GetBillSummarySchema = z.object({
  bill_id: CommonSchemas.id,
  language: LanguageSchema.default('en'),
  format: z.enum(['short', 'medium', 'detailed']).default('short'),
  max_length: z.number().int().positive().max(1600).default(160),
});

export const SearchBillsUSSDSchema = z.object({
  query: z.string().min(1).max(100),
  language: LanguageSchema.default('en'),
  limit: z.number().int().positive().max(10).default(5),
});

export const GetVotingInfoSchema = z.object({
  location: z.object({
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
    state: z.string().length(2).optional(),
    district: z.string().max(50).optional(),
  }),
  language: LanguageSchema.default('en'),
});

export const GetRepresentativeSchema = z.object({
  location: z.object({
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
    state: z.string().length(2).optional(),
  }),
  level: z.enum(['federal', 'state', 'local', 'all']).default('federal'),
  language: LanguageSchema.default('en'),
});

// ============================================================================
// User Preferences Schemas
// ============================================================================

export const UpdateUSSDPreferencesSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  preferences: z.object({
    language: LanguageSchema.optional(),
    accessibility_mode: AccessibilityModeSchema.optional(),
    notification_enabled: z.boolean().optional(),
    favorite_topics: z.array(z.string().max(100)).max(10).optional(),
    session_timeout: z.number().int().positive().max(600).optional(), // seconds
  }),
});

export const GetUSSDPreferencesSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const SendUSSDNotificationSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  message: z.string().min(1).max(160),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  language: LanguageSchema.default('en'),
  retry_on_failure: z.boolean().default(true),
});

export const SubscribeToAlertsSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  alert_types: z.array(z.enum([
    'bill_updates',
    'voting_reminders',
    'representative_actions',
    'system_alerts'
  ])).min(1).max(4),
  frequency: z.enum(['immediate', 'daily', 'weekly']).default('daily'),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetSessionStatsSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['state', 'language', 'status', 'date']).optional(),
});

export const GetUsageMetricsSchema = z.object({
  metric_type: z.enum([
    'session_count',
    'active_users',
    'popular_features',
    'completion_rate',
    'error_rate'
  ]),
  timeframe: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  language: LanguageSchema.optional(),
});

export const GetPopularQueriesSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month']).default('week'),
  language: LanguageSchema.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Accessibility Schemas
// ============================================================================

export const ConvertToAudioSchema = z.object({
  text: z.string().min(1).max(1600),
  language: LanguageSchema.default('en'),
  voice: z.enum(['male', 'female', 'neutral']).default('neutral'),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
});

export const SimplifyTextSchema = z.object({
  text: z.string().min(1).max(5000),
  target_reading_level: z.enum(['elementary', 'middle_school', 'high_school']).default('middle_school'),
  language: LanguageSchema.default('en'),
  max_length: z.number().int().positive().max(1600).optional(),
});

// ============================================================================
// Error Handling Schemas
// ============================================================================

export const LogUSSDErrorSchema = z.object({
  session_id: CommonSchemas.id,
  error_type: z.enum(['timeout', 'invalid_input', 'service_unavailable', 'network_error', 'other']),
  error_message: z.string().max(500),
  current_state: MenuStateSchema,
  user_input: z.string().max(160).optional(),
  stack_trace: z.string().max(5000).optional(),
});

export const GetErrorStatsSchema = z.object({
  error_type: z.enum(['timeout', 'invalid_input', 'service_unavailable', 'network_error', 'other']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['type', 'state', 'date']).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;
export type GetMenuInput = z.infer<typeof GetMenuSchema>;
export type ProcessInputInput = z.infer<typeof ProcessInputSchema>;
export type NavigateMenuInput = z.infer<typeof NavigateMenuSchema>;
export type GetBillSummaryInput = z.infer<typeof GetBillSummarySchema>;
export type SearchBillsUSSDInput = z.infer<typeof SearchBillsUSSDSchema>;
export type GetVotingInfoInput = z.infer<typeof GetVotingInfoSchema>;
export type GetRepresentativeInput = z.infer<typeof GetRepresentativeSchema>;
export type UpdateUSSDPreferencesInput = z.infer<typeof UpdateUSSDPreferencesSchema>;
export type GetUSSDPreferencesInput = z.infer<typeof GetUSSDPreferencesSchema>;
export type SendUSSDNotificationInput = z.infer<typeof SendUSSDNotificationSchema>;
export type SubscribeToAlertsInput = z.infer<typeof SubscribeToAlertsSchema>;
export type GetSessionStatsInput = z.infer<typeof GetSessionStatsSchema>;
export type GetUsageMetricsInput = z.infer<typeof GetUsageMetricsSchema>;
export type GetPopularQueriesInput = z.infer<typeof GetPopularQueriesSchema>;
export type ConvertToAudioInput = z.infer<typeof ConvertToAudioSchema>;
export type SimplifyTextInput = z.infer<typeof SimplifyTextSchema>;
export type LogUSSDErrorInput = z.infer<typeof LogUSSDErrorSchema>;
export type GetErrorStatsInput = z.infer<typeof GetErrorStatsSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type MenuState = z.infer<typeof MenuStateSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type AccessibilityMode = z.infer<typeof AccessibilityModeSchema>;
