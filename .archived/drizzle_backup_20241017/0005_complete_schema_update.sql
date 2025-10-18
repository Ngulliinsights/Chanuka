
-- Complete schema update with all features
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_bill_id" uuid,
	"related_comment_id" uuid,
	"is_read" boolean DEFAULT false,
	"priority" varchar(20) DEFAULT 'normal',
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_bill_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"tracking_type" varchar(50) NOT NULL,
	"notifications_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);

-- Add missing columns to existing tables
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;

ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "parliamentary_stage" varchar(100);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "constitutional_compliance" jsonb;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "impact_assessment" jsonb;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "stakeholder_analysis" jsonb;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "public_support" numeric(5,2) DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'medium';
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false;

ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_expert_comment" boolean DEFAULT false;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "sentiment" varchar(20);
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "confidence_score" numeric(5,2);
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "flagged_count" integer DEFAULT 0;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;

ALTER TABLE "bill_engagement" ADD COLUMN IF NOT EXISTS "engagement_data" jsonb;
ALTER TABLE "bill_engagement" ADD COLUMN IF NOT EXISTS "session_duration" integer;

ALTER TABLE "implementation_workarounds" ADD COLUMN IF NOT EXISTS "similarity_analysis" jsonb;
ALTER TABLE "implementation_workarounds" ADD COLUMN IF NOT EXISTS "alert_status" varchar(50) DEFAULT 'active';
ALTER TABLE "implementation_workarounds" ADD COLUMN IF NOT EXISTS "public_notification_sent" boolean DEFAULT false;
ALTER TABLE "implementation_workarounds" ADD COLUMN IF NOT EXISTS "evidence_documents" jsonb;
ALTER TABLE "implementation_workarounds" ADD COLUMN IF NOT EXISTS "community_confirmations" integer DEFAULT 0;

ALTER TABLE "analysis" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "analysis" ADD COLUMN IF NOT EXISTS "version" varchar(20) DEFAULT '1.0';
ALTER TABLE "analysis" ADD COLUMN IF NOT EXISTS "is_latest" boolean DEFAULT true;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "verification_documents" jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "social_links" jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferred_language" varchar(10) DEFAULT 'en';
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "notification_settings" jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "privacy_settings" jsonb;

-- Change column types if needed
ALTER TABLE "implementation_workarounds" ALTER COLUMN "similarity_score" TYPE numeric(5,2);
ALTER TABLE "analysis" ALTER COLUMN "confidence" TYPE numeric(5,2);

-- Add foreign key constraints for new tables
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_bill_id_bills_id_fk" FOREIGN KEY ("related_bill_id") REFERENCES "bills"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_comment_id_comments_id_fk" FOREIGN KEY ("related_comment_id") REFERENCES "comments"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "user_bill_tracking" ADD CONSTRAINT "user_bill_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_bill_tracking" ADD CONSTRAINT "user_bill_tracking_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "idx_user_bill_tracking_user_id" ON "user_bill_tracking"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_bill_tracking_bill_id" ON "user_bill_tracking"("bill_id");
CREATE INDEX IF NOT EXISTS "idx_bills_status" ON "bills"("status");
CREATE INDEX IF NOT EXISTS "idx_bills_category" ON "bills"("category");
CREATE INDEX IF NOT EXISTS "idx_comments_bill_id" ON "comments"("bill_id");
CREATE INDEX IF NOT EXISTS "idx_implementation_workarounds_status" ON "implementation_workarounds"("verification_status");

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_bill_tracking" ON "user_bill_tracking"("user_id", "bill_id", "tracking_type");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_comment_vote" ON "comment_votes"("comment_id", "user_id");
