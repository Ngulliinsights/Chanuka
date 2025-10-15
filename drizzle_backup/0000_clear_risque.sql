CREATE TABLE IF NOT EXISTS "analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"analysis_type" text NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb,
	"confidence" numeric(5, 4) DEFAULT '0',
	"model_version" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"comment_type" text DEFAULT 'general' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"parent_comment_id" integer,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_engagement" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(10, 2) DEFAULT '0' NOT NULL,
	"last_engaged" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_section_conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"section_number" text NOT NULL,
	"conflict_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"recommendation" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_sponsorships" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"sponsorship_type" text NOT NULL,
	"sponsorship_date" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"summary" text,
	"status" text DEFAULT 'introduced' NOT NULL,
	"bill_number" text,
	"sponsor_id" integer,
	"category" text,
	"tags" text[] DEFAULT '{}',
	"view_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(10, 2) DEFAULT '0' NOT NULL,
	"complexity_score" integer,
	"constitutional_concerns" jsonb DEFAULT '[]'::jsonb,
	"stakeholder_analysis" jsonb DEFAULT '{}'::jsonb,
	"introduced_date" timestamp,
	"last_action_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "citizen_verifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"citizen_id" uuid NOT NULL,
	"verification_type" varchar(50) NOT NULL,
	"verification_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"evidence" jsonb DEFAULT '[]' NOT NULL,
	"expertise" jsonb DEFAULT '{}' NOT NULL,
	"reasoning" text NOT NULL,
	"endorsements" integer DEFAULT 0 NOT NULL,
	"disputes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_name" text NOT NULL,
	"check_type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'passing' NOT NULL,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"next_check" timestamp,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"remediation" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"automated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conflict_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"conflict_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"value" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"priority" numeric(3, 2) NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"data_type" text NOT NULL,
	"record_id" text NOT NULL,
	"resolution" text DEFAULT 'pending' NOT NULL,
	"resolved_value" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"confidence" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"toxicity_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"spam_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"sentiment_score" numeric(5, 4) DEFAULT '0.5' NOT NULL,
	"readability_score" numeric(5, 4) DEFAULT '0.5' NOT NULL,
	"flags" text[] DEFAULT '{}',
	"confidence" numeric(5, 4) DEFAULT '0.8' NOT NULL,
	"model_version" text DEFAULT '1.0' NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_name" text NOT NULL,
	"department_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"expert_id" uuid NOT NULL,
	"verification_status" text NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0',
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"reason" text NOT NULL,
	"moderator_id" uuid NOT NULL,
	"duration" integer,
	"is_reversible" boolean DEFAULT true NOT NULL,
	"reversed_at" timestamp,
	"reversed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"flag_type" text NOT NULL,
	"reason" text NOT NULL,
	"reported_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"auto_detected" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_bill_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"source" text,
	"sector" text,
	"tags" text[] DEFAULT '{}',
	"sponsor_id" integer,
	"effective_date" timestamp,
	"compliance_deadline" timestamp,
	"affected_stakeholders" integer DEFAULT 0,
	"estimated_impact" numeric(10, 2) DEFAULT '0',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulatory_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"regulation_id" uuid NOT NULL,
	"change_type" text,
	"changes_requirements" boolean DEFAULT false NOT NULL,
	"shortens_deadline" boolean DEFAULT false NOT NULL,
	"adds_costs" boolean DEFAULT false NOT NULL,
	"affects_compliance" boolean DEFAULT false NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"reported_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulatory_impact" (
	"id" serial PRIMARY KEY NOT NULL,
	"regulation_id" uuid NOT NULL,
	"sector" text,
	"impact_level" text,
	"affected_entities" jsonb DEFAULT '[]'::jsonb,
	"mitigation" jsonb DEFAULT '{}'::jsonb,
	"impact_score" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"resource" text,
	"action" text,
	"result" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"session_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"platform" text NOT NULL,
	"user_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"share_date" timestamp DEFAULT now() NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsor_affiliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"sponsor_id" integer NOT NULL,
	"organization" text NOT NULL,
	"role" text,
	"type" text NOT NULL,
	"conflict_type" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsor_transparency" (
	"id" serial PRIMARY KEY NOT NULL,
	"sponsor_id" integer NOT NULL,
	"disclosure_type" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2),
	"source" text,
	"date_reported" timestamp,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"party" text,
	"constituency" text,
	"email" text,
	"phone" text,
	"bio" text,
	"photo_url" text,
	"conflict_level" text,
	"financial_exposure" numeric(12, 2) DEFAULT '0',
	"voting_alignment" numeric(5, 2) DEFAULT '0',
	"transparency_score" numeric(5, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stakeholders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"organization" text,
	"sector" text,
	"type" text NOT NULL,
	"influence" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"voting_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"record_id" text,
	"endpoint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"data_source_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"records_created" integer DEFAULT 0 NOT NULL,
	"records_skipped" integer DEFAULT 0 NOT NULL,
	"is_incremental" boolean DEFAULT true NOT NULL,
	"last_sync_timestamp" timestamp,
	"next_run_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_intelligence" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"threat_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"source" text NOT NULL,
	"description" text,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_interests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"interest" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"expertise" text[] DEFAULT '{}',
	"location" text,
	"organization" text,
	"verification_documents" jsonb DEFAULT '[]'::jsonb,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reputation_score_check" CHECK ("user_profiles"."reputation_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_type" text NOT NULL,
	"achievement_value" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1,
	"badge" text,
	"description" text,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_social_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"name" text NOT NULL,
	"role" text DEFAULT 'citizen' NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis" ADD CONSTRAINT "analysis_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis" ADD CONSTRAINT "analysis_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_comments" ADD CONSTRAINT "bill_comments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_comments" ADD CONSTRAINT "bill_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_comments" ADD CONSTRAINT "bill_comments_parent_comment_id_bill_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."bill_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_engagement" ADD CONSTRAINT "bill_engagement_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_engagement" ADD CONSTRAINT "bill_engagement_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_section_conflicts" ADD CONSTRAINT "bill_section_conflicts_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_sponsorships" ADD CONSTRAINT "bill_sponsorships_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_sponsorships" ADD CONSTRAINT "bill_sponsorships_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_tags" ADD CONSTRAINT "bill_tags_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_bill_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."bill_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conflict_sources" ADD CONSTRAINT "conflict_sources_conflict_id_conflicts_id_fk" FOREIGN KEY ("conflict_id") REFERENCES "public"."conflicts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_verifications" ADD CONSTRAINT "expert_verifications_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_verifications" ADD CONSTRAINT "expert_verifications_expert_id_users_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_bill_id_bills_id_fk" FOREIGN KEY ("related_bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulations" ADD CONSTRAINT "regulations_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_changes" ADD CONSTRAINT "regulatory_changes_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_changes" ADD CONSTRAINT "regulatory_changes_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulatory_impact" ADD CONSTRAINT "regulatory_impact_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_audit_logs" ADD CONSTRAINT "security_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sponsor_affiliations" ADD CONSTRAINT "sponsor_affiliations_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sponsor_transparency" ADD CONSTRAINT "sponsor_transparency_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_errors" ADD CONSTRAINT "sync_errors_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."sync_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_social_profiles" ADD CONSTRAINT "user_social_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analysis_bill_type_idx" ON "analysis" USING btree ("bill_id","analysis_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_type_idx" ON "analysis" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_is_approved_idx" ON "analysis" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_comments_bill_id_idx" ON "bill_comments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_comments_user_id_idx" ON "bill_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_comments_parent_comment_id_idx" ON "bill_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_comments_created_at_idx" ON "bill_comments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_engagement_bill_user_idx" ON "bill_engagement" USING btree ("bill_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_engagement_user_id_idx" ON "bill_engagement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_engagement_score_idx" ON "bill_engagement" USING btree ("engagement_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_engagement_last_engaged_idx" ON "bill_engagement" USING btree ("last_engaged");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_section_conflicts_bill_id_idx" ON "bill_section_conflicts" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_section_conflicts_severity_idx" ON "bill_section_conflicts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_section_conflicts_is_resolved_idx" ON "bill_section_conflicts" USING btree ("is_resolved");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_sponsorships_bill_sponsor_idx" ON "bill_sponsorships" USING btree ("bill_id","sponsor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_sponsorships_sponsor_id_idx" ON "bill_sponsorships" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_sponsorships_is_active_idx" ON "bill_sponsorships" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_tags_bill_tag_idx" ON "bill_tags" USING btree ("bill_id","tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_tags_tag_idx" ON "bill_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bills_bill_number_idx" ON "bills" USING btree ("bill_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_category_idx" ON "bills" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_sponsor_id_idx" ON "bills" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_introduced_date_idx" ON "bills" USING btree ("introduced_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_engagement_score_idx" ON "bills" USING btree ("engagement_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "citizen_verifications_bill_id_idx" ON "citizen_verifications" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "citizen_verifications_citizen_id_idx" ON "citizen_verifications" USING btree ("citizen_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "citizen_verifications_status_idx" ON "citizen_verifications" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "citizen_verifications_bill_citizen_idx" ON "citizen_verifications" USING btree ("bill_id","citizen_id","verification_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comment_votes_comment_user_idx" ON "comment_votes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_votes_user_id_idx" ON "comment_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_checks_check_type_idx" ON "compliance_checks" USING btree ("check_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_checks_status_idx" ON "compliance_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_checks_next_check_idx" ON "compliance_checks" USING btree ("next_check");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_checks_priority_idx" ON "compliance_checks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conflict_sources_conflict_id_idx" ON "conflict_sources" USING btree ("conflict_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conflict_sources_source_id_idx" ON "conflict_sources" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conflicts_data_type_record_idx" ON "conflicts" USING btree ("data_type","record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conflicts_resolution_idx" ON "conflicts" USING btree ("resolution");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_analysis_content_idx" ON "content_analysis" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_analysis_toxicity_idx" ON "content_analysis" USING btree ("toxicity_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_analysis_spam_idx" ON "content_analysis" USING btree ("spam_score");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "departments_name_idx" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "departments_is_active_idx" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluations_department_id_idx" ON "evaluations" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluations_status_idx" ON "evaluations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expert_verifications_bill_expert_idx" ON "expert_verifications" USING btree ("bill_id","expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expert_verifications_expert_id_idx" ON "expert_verifications" USING btree ("expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expert_verifications_status_idx" ON "expert_verifications" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_actions_content_idx" ON "moderation_actions" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_actions_action_type_idx" ON "moderation_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_actions_moderator_id_idx" ON "moderation_actions" USING btree ("moderator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_flags_content_idx" ON "moderation_flags" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_flags_status_idx" ON "moderation_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_flags_severity_idx" ON "moderation_flags" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_flags_reported_by_idx" ON "moderation_flags" USING btree ("reported_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_user_id_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_hash_idx" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_expires_at_idx" ON "password_resets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_session_id_idx" ON "refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulations_status_idx" ON "regulations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulations_sector_idx" ON "regulations" USING btree ("sector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulations_effective_date_idx" ON "regulations" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_changes_regulation_id_idx" ON "regulatory_changes" USING btree ("regulation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_changes_change_type_idx" ON "regulatory_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_changes_changed_at_idx" ON "regulatory_changes" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_impact_regulation_id_idx" ON "regulatory_impact" USING btree ("regulation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_impact_sector_idx" ON "regulatory_impact" USING btree ("sector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regulatory_impact_impact_level_idx" ON "regulatory_impact" USING btree ("impact_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_audit_logs_event_type_idx" ON "security_audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_audit_logs_user_id_idx" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_audit_logs_timestamp_idx" ON "security_audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_audit_logs_severity_idx" ON "security_audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_audit_logs_result_idx" ON "security_audit_logs" USING btree ("result");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_is_active_idx" ON "sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_bill_id_idx" ON "social_shares" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_user_id_idx" ON "social_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_platform_idx" ON "social_shares" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_share_date_idx" ON "social_shares" USING btree ("share_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_affiliations_sponsor_id_idx" ON "sponsor_affiliations" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_affiliations_organization_idx" ON "sponsor_affiliations" USING btree ("organization");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_affiliations_is_active_idx" ON "sponsor_affiliations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_transparency_sponsor_id_idx" ON "sponsor_transparency" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_transparency_disclosure_type_idx" ON "sponsor_transparency" USING btree ("disclosure_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsor_transparency_is_verified_idx" ON "sponsor_transparency" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsors_name_idx" ON "sponsors" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsors_party_idx" ON "sponsors" USING btree ("party");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsors_is_active_idx" ON "sponsors" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sponsors_name_email_idx" ON "sponsors" USING btree ("name","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stakeholders_name_idx" ON "stakeholders" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stakeholders_sector_idx" ON "stakeholders" USING btree ("sector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stakeholders_type_idx" ON "stakeholders" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_errors_job_id_idx" ON "sync_errors" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_errors_level_idx" ON "sync_errors" USING btree ("level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_errors_timestamp_idx" ON "sync_errors" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_jobs_status_idx" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_jobs_data_source_idx" ON "sync_jobs" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_jobs_next_run_time_idx" ON "sync_jobs" USING btree ("next_run_time");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "threat_intelligence_ip_address_idx" ON "threat_intelligence" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threat_intelligence_threat_type_idx" ON "threat_intelligence" USING btree ("threat_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threat_intelligence_severity_idx" ON "threat_intelligence" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threat_intelligence_is_active_idx" ON "threat_intelligence" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_interests_user_interest_idx" ON "user_interests" USING btree ("user_id","interest");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_interests_interest_idx" ON "user_interests" USING btree ("interest");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_reputation_idx" ON "user_profiles" USING btree ("reputation_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_user_id_idx" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_achievement_type_idx" ON "user_progress" USING btree ("achievement_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_progress_user_achievement_idx" ON "user_progress" USING btree ("user_id","achievement_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_social_profiles_user_provider_idx" ON "user_social_profiles" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_social_profiles_provider_id_idx" ON "user_social_profiles" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_verification_status_idx" ON "users" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_verified_idx" ON "users" USING btree ("is_active","verification_status");