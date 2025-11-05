/**
 * Migration State Tracking Database Schema
 * 
 * Defines database schema for tracking migration state, validation checkpoints,
 * and inter-phase verification data.
 */

import { pgTable, text, integer, timestamp, boolean, jsonb, uuid, decimal } from 'drizzle-orm/pg-core';

/**
 * Migration phases tracking table
 */
export const migrationPhases = pgTable('migration_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  phase: integer('phase').notNull(), // 1-5 for the five migration phases
  name: text('name').notNull(), // e.g., 'utilities', 'search', 'error-handling'
  status: text('status').notNull(), // 'not_started', 'in_progress', 'testing', 'rolled_out', 'completed'
  rolloutPercentage: decimal('rollout_percentage', { precision: 5, scale: 2 }).default('0.00'),
  startTime: timestamp('start_time'),
  completionTime: timestamp('completion_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

/**
 * Migration components tracking table
 */
export const migrationComponents = pgTable('migration_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id').references(() => migrationPhases.id),
  name: text('name').notNull(), // e.g., 'concurrency-adapter', 'query-builder'
  status: text('status').notNull(),
  rolloutPercentage: decimal('rollout_percentage', { precision: 5, scale: 2 }).default('0.00'),
  featureFlagName: text('feature_flag_name').notNull(),
  legacyImplementation: text('legacy_implementation'),
  newImplementation: text('new_implementation'),
  startTime: timestamp('start_time'),
  completionTime: timestamp('completion_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

/**
 * Data validation checkpoints table
 */
export const dataValidationCheckpoints = pgTable('data_validation_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  checkpointName: text('checkpoint_name').notNull(),
  validationType: text('validation_type').notNull(), // 'data_consistency', 'performance', 'functionality'
  status: text('status').notNull(), // 'pending', 'running', 'passed', 'failed'
  validationResults: jsonb('validation_results'), // Detailed validation results
  dataPointsValidated: integer('data_points_validated').default(0),
  inconsistenciesFound: integer('inconsistencies_found').default(0),
  executionTime: integer('execution_time_ms'),
  startTime: timestamp('start_time'),
  completionTime: timestamp('completion_time'),
  createdAt: timestamp('created_at').defaultNow()
});

/**
 * Migration metrics tracking table
 */
export const migrationMetrics = pgTable('migration_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  metricType: text('metric_type').notNull(), // 'performance', 'error_rate', 'memory_usage'
  metricName: text('metric_name').notNull(),
  value: decimal('value', { precision: 15, scale: 6 }).notNull(),
  unit: text('unit'), // 'ms', 'percent', 'bytes', etc.
  cohort: text('cohort'), // 'control', 'treatment' for A/B testing
  userId: text('user_id'), // For user-specific metrics
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata') // Additional context data
});

/**
 * A/B testing cohorts table
 */
export const abTestingCohorts = pgTable('ab_testing_cohorts', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  userId: text('user_id').notNull(),
  cohort: text('cohort').notNull(), // 'control' or 'treatment'
  assignedAt: timestamp('assigned_at').defaultNow(),
  userHash: integer('user_hash').notNull(), // Hash used for consistent assignment
  metadata: jsonb('metadata') // User characteristics, etc.
});

/**
 * Statistical significance results table
 */
export const statisticalResults = pgTable('statistical_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  metricName: text('metric_name').notNull(),
  controlMean: decimal('control_mean', { precision: 15, scale: 6 }),
  treatmentMean: decimal('treatment_mean', { precision: 15, scale: 6 }),
  pValue: decimal('p_value', { precision: 10, scale: 9 }),
  effectSize: decimal('effect_size', { precision: 10, scale: 6 }),
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 4 }).default('0.95'),
  isSignificant: boolean('is_significant').default(false),
  sampleSizeControl: integer('sample_size_control'),
  sampleSizeTreatment: integer('sample_size_treatment'),
  recommendation: text('recommendation'), // 'continue', 'rollback', 'expand'
  calculatedAt: timestamp('calculated_at').defaultNow(),
  metadata: jsonb('metadata')
});

/**
 * Rollback events table
 */
export const rollbackEvents = pgTable('rollback_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  trigger: text('trigger').notNull(), // 'manual', 'automatic'
  reason: text('reason').notNull(),
  status: text('status').notNull(), // 'initiated', 'in_progress', 'completed', 'failed'
  rollbackSteps: jsonb('rollback_steps'), // Array of rollback steps with status
  initiatedBy: text('initiated_by'), // User ID or 'system'
  startTime: timestamp('start_time').defaultNow(),
  completionTime: timestamp('completion_time'),
  failureReason: text('failure_reason'),
  metadata: jsonb('metadata')
});

/**
 * Alert events table
 */
export const alertEvents = pgTable('alert_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  alertType: text('alert_type').notNull(), // 'threshold_violation', 'system_error', 'rollback_triggered'
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  metricName: text('metric_name'),
  currentValue: decimal('current_value', { precision: 15, scale: 6 }),
  thresholdValue: decimal('threshold_value', { precision: 15, scale: 6 }),
  message: text('message').notNull(),
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata')
});

/**
 * Inter-phase validation results table
 */
export const interPhaseValidation = pgTable('inter_phase_validation', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromPhaseId: uuid('from_phase_id').references(() => migrationPhases.id),
  toPhaseId: uuid('to_phase_id').references(() => migrationPhases.id),
  validationType: text('validation_type').notNull(), // 'data_consistency', 'api_compatibility', 'performance'
  status: text('status').notNull(), // 'pending', 'running', 'passed', 'failed'
  validationResults: jsonb('validation_results'),
  inconsistenciesFound: integer('inconsistencies_found').default(0),
  criticalIssues: integer('critical_issues').default(0),
  warningIssues: integer('warning_issues').default(0),
  executionTime: integer('execution_time_ms'),
  startTime: timestamp('start_time'),
  completionTime: timestamp('completion_time'),
  createdAt: timestamp('created_at').defaultNow()
});

/**
 * User behavior tracking table for A/B testing
 */
export const userBehaviorTracking = pgTable('user_behavior_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').references(() => migrationComponents.id),
  userId: text('user_id').notNull(),
  cohort: text('cohort').notNull(),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(), // 'page_view', 'task_completion', 'error', 'conversion'
  eventData: jsonb('event_data'),
  conversionValue: decimal('conversion_value', { precision: 10, scale: 2 }),
  sessionDuration: integer('session_duration_ms'),
  satisfactionScore: integer('satisfaction_score'), // 1-10 scale
  taskCompleted: boolean('task_completed').default(false),
  errorOccurred: boolean('error_occurred').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata')
});

// Export all tables for use in migrations and queries
export const migrationTables = {
  migrationPhases,
  migrationComponents,
  dataValidationCheckpoints,
  migrationMetrics,
  abTestingCohorts,
  statisticalResults,
  rollbackEvents,
  alertEvents,
  interPhaseValidation,
  userBehaviorTracking
};