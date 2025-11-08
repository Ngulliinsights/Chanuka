-- Migration Infrastructure Schema
-- Creates tables for tracking migration state, validation checkpoints, and monitoring

-- Migration phases tracking table
CREATE TABLE IF NOT EXISTS "migration_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" integer NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"rollout_percentage" numeric(5,2) DEFAULT '0.00',
	"start_time" timestamp,
	"completion_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Migration components tracking table
CREATE TABLE IF NOT EXISTS "migration_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"rollout_percentage" numeric(5,2) DEFAULT '0.00',
	"feature_flag_name" text NOT NULL,
	"legacy_implementation" text,
	"new_implementation" text,
	"start_time" timestamp,
	"completion_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Data validation checkpoints table
CREATE TABLE IF NOT EXISTS "data_validation_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"checkpoint_name" text NOT NULL,
	"validation_type" text NOT NULL,
	"status" text NOT NULL,
	"validation_results" jsonb,
	"data_points_validated" integer DEFAULT 0,
	"inconsistencies_found" integer DEFAULT 0,
	"execution_time_ms" integer,
	"start_time" timestamp,
	"completion_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Migration metrics tracking table
CREATE TABLE IF NOT EXISTS "migration_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"metric_type" text NOT NULL,
	"metric_name" text NOT NULL,
	"value" numeric(15,6) NOT NULL,
	"unit" text,
	"cohort" text,
	"user_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);

-- A/B testing cohorts table
CREATE TABLE IF NOT EXISTS "ab_testing_cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"user_id" text NOT NULL,
	"cohort" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"user_hash" integer NOT NULL,
	"metadata" jsonb
);

-- Statistical significance results table
CREATE TABLE IF NOT EXISTS "statistical_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"metric_name" text NOT NULL,
	"control_mean" numeric(15,6),
	"treatment_mean" numeric(15,6),
	"p_value" numeric(10,9),
	"effect_size" numeric(10,6),
	"confidence_level" numeric(5,4) DEFAULT '0.95',
	"is_significant" boolean DEFAULT false,
	"sample_size_control" integer,
	"sample_size_treatment" integer,
	"recommendation" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);

-- Rollback events table
CREATE TABLE IF NOT EXISTS "rollback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"trigger" text NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"rollback_steps" jsonb,
	"initiated_by" text,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"completion_time" timestamp,
	"failure_reason" text,
	"metadata" jsonb
);

-- Alert events table
CREATE TABLE IF NOT EXISTS "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"metric_name" text,
	"current_value" numeric(15,6),
	"threshold_value" numeric(15,6),
	"message" text NOT NULL,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);

-- Inter-phase validation results table
CREATE TABLE IF NOT EXISTS "inter_phase_validation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_phase_id" uuid,
	"to_phase_id" uuid,
	"validation_type" text NOT NULL,
	"status" text NOT NULL,
	"validation_results" jsonb,
	"inconsistencies_found" integer DEFAULT 0,
	"critical_issues" integer DEFAULT 0,
	"warning_issues" integer DEFAULT 0,
	"execution_time_ms" integer,
	"start_time" timestamp,
	"completion_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- User behavior tracking table for A/B testing
CREATE TABLE IF NOT EXISTS "user_behavior_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"user_id" text NOT NULL,
	"cohort" text NOT NULL,
	"session_id" text,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"conversion_value" numeric(10,2),
	"session_duration_ms" integer,
	"satisfaction_score" integer,
	"task_completed" boolean DEFAULT false,
	"error_occurred" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "migration_components" ADD CONSTRAINT "migration_components_phase_id_migration_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "migration_phases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_validation_checkpoints" ADD CONSTRAINT "data_validation_checkpoints_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "migration_metrics" ADD CONSTRAINT "migration_metrics_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ab_testing_cohorts" ADD CONSTRAINT "ab_testing_cohorts_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "statistical_results" ADD CONSTRAINT "statistical_results_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "rollback_events" ADD CONSTRAINT "rollback_events_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "inter_phase_validation" ADD CONSTRAINT "inter_phase_validation_from_phase_id_migration_phases_id_fk" FOREIGN KEY ("from_phase_id") REFERENCES "migration_phases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "inter_phase_validation" ADD CONSTRAINT "inter_phase_validation_to_phase_id_migration_phases_id_fk" FOREIGN KEY ("to_phase_id") REFERENCES "migration_phases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_behavior_tracking" ADD CONSTRAINT "user_behavior_tracking_component_id_migration_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "migration_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_migration_phases_status" ON "migration_phases" ("status");
CREATE INDEX IF NOT EXISTS "idx_migration_components_phase_id" ON "migration_components" ("phase_id");
CREATE INDEX IF NOT EXISTS "idx_migration_components_status" ON "migration_components" ("status");
CREATE INDEX IF NOT EXISTS "idx_migration_components_feature_flag" ON "migration_components" ("feature_flag_name");
CREATE INDEX IF NOT EXISTS "idx_validation_checkpoints_component" ON "data_validation_checkpoints" ("component_id");
CREATE INDEX IF NOT EXISTS "idx_validation_checkpoints_status" ON "data_validation_checkpoints" ("status");
CREATE INDEX IF NOT EXISTS "idx_migration_metrics_component" ON "migration_metrics" ("component_id");
CREATE INDEX IF NOT EXISTS "idx_migration_metrics_timestamp" ON "migration_metrics" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_migration_metrics_cohort" ON "migration_metrics" ("cohort");
CREATE INDEX IF NOT EXISTS "idx_ab_cohorts_user_component" ON "ab_testing_cohorts" ("user_id", "component_id");
CREATE INDEX IF NOT EXISTS "idx_statistical_results_component" ON "statistical_results" ("component_id");
CREATE INDEX IF NOT EXISTS "idx_rollback_events_component" ON "rollback_events" ("component_id");
CREATE INDEX IF NOT EXISTS "idx_rollback_events_status" ON "rollback_events" ("status");
CREATE INDEX IF NOT EXISTS "idx_alert_events_component" ON "alert_events" ("component_id");
CREATE INDEX IF NOT EXISTS "idx_alert_events_resolved" ON "alert_events" ("resolved");
CREATE INDEX IF NOT EXISTS "idx_alert_events_severity" ON "alert_events" ("severity");
CREATE INDEX IF NOT EXISTS "idx_inter_phase_validation_phases" ON "inter_phase_validation" ("from_phase_id", "to_phase_id");
CREATE INDEX IF NOT EXISTS "idx_user_behavior_user_component" ON "user_behavior_tracking" ("user_id", "component_id");
CREATE INDEX IF NOT EXISTS "idx_user_behavior_timestamp" ON "user_behavior_tracking" ("timestamp");

-- Insert initial migration phases
INSERT INTO "migration_phases" ("phase", "name", "status") VALUES
(1, 'utilities', 'not_started'),
(2, 'search', 'not_started'),
(3, 'error-handling', 'not_started'),
(4, 'repository', 'not_started'),
(5, 'websocket', 'not_started')
ON CONFLICT DO NOTHING;