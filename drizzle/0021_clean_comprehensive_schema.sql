-- Clean Comprehensive Schema Migration
-- This migration creates a complete, consistent database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar(255) UNIQUE NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'citizen' NOT NULL,
    "is_verified" boolean DEFAULT false,
    "verification_token" varchar(255),
    "verification_expires_at" timestamp,
    "password_reset_token" varchar(255),
    "password_reset_expires_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "last_login_at" timestamp,
    "is_active" boolean DEFAULT true NOT NULL
);

-- User profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "first_name" varchar(100),
    "last_name" varchar(100),
    "display_name" varchar(150),
    "bio" text,
    "location" varchar(255),
    "website" varchar(255),
    "avatar_url" varchar(500),
    "preferences" jsonb DEFAULT '{}'::jsonb,
    "privacy_settings" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" varchar(255) PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" timestamp NOT NULL,
    "data" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Bills table
CREATE TABLE IF NOT EXISTS "bills" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "bill_number" varchar(50) UNIQUE NOT NULL,
    "title" varchar(500) NOT NULL,
    "summary" text,
    "full_text" text,
    "status" varchar(50) DEFAULT 'introduced' NOT NULL,
    "introduced_date" date,
    "last_action_date" date,
    "chamber" varchar(20),
    "congress_session" integer,
    "sponsor_id" uuid,
    "committee" varchar(255),
    "tags" text[],
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "search_vector" tsvector,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS "sponsors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(255) NOT NULL,
    "party" varchar(50),
    "state" varchar(2),
    "district" varchar(10),
    "chamber" varchar(20),
    "bio" text,
    "website" varchar(255),
    "social_media" jsonb DEFAULT '{}'::jsonb,
    "financial_disclosures" jsonb DEFAULT '{}'::jsonb,
    "voting_record" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key for bill sponsor
ALTER TABLE "bills" ADD CONSTRAINT "bills_sponsor_id_fkey"
    FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE SET NULL;

-- Bill co-sponsors junction table
CREATE TABLE IF NOT EXISTS "bill_cosponsors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "bill_id" uuid NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
    "sponsor_id" uuid NOT NULL REFERENCES "sponsors"("id") ON DELETE CASCADE,
    "date_cosponsored" date DEFAULT CURRENT_DATE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("bill_id", "sponsor_id")
);

-- Comments table
CREATE TABLE IF NOT EXISTS "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "bill_id" uuid NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
    "parent_id" uuid REFERENCES "comments"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "is_expert_opinion" boolean DEFAULT false,
    "expert_credentials" text,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "is_flagged" boolean DEFAULT false,
    "moderation_status" varchar(20) DEFAULT 'approved',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Comment votes table
CREATE TABLE IF NOT EXISTS "comment_votes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "comment_id" uuid NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
    "vote_type" varchar(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    "created_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("user_id", "comment_id")
);

-- Bill engagement table
CREATE TABLE IF NOT EXISTS "bill_engagement" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "bill_id" uuid NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
    "engagement_type" varchar(50) NOT NULL,
    "engagement_data" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("user_id", "bill_id", "engagement_type")
);

-- User verification table
CREATE TABLE IF NOT EXISTS "user_verification" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "verification_type" varchar(50) NOT NULL,
    "verification_status" varchar(20) DEFAULT 'pending',
    "verification_data" jsonb DEFAULT '{}'::jsonb,
    "verified_by" uuid REFERENCES "users"("id"),
    "verified_at" timestamp,
    "expires_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "data" jsonb DEFAULT '{}'::jsonb,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "read_at" timestamp
);

-- Alert preferences table
CREATE TABLE IF NOT EXISTS "alert_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "bill_updates" boolean DEFAULT true,
    "comment_replies" boolean DEFAULT true,
    "weekly_digest" boolean DEFAULT true,
    "preferences" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Compliance checks table
CREATE TABLE IF NOT EXISTS "compliance_checks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "check_type" varchar(100) NOT NULL,
    "entity_type" varchar(50) NOT NULL,
    "entity_id" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'pending',
    "result" jsonb DEFAULT '{}'::jsonb,
    "last_checked" timestamp DEFAULT now(),
    "next_check" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("check_type", "entity_type", "entity_id")
);

-- Security monitoring table
CREATE TABLE IF NOT EXISTS "security_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_type" varchar(100) NOT NULL,
    "severity" varchar(20) DEFAULT 'info',
    "source_ip" inet,
    "user_id" uuid REFERENCES "users"("id"),
    "event_data" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_type" varchar(100) NOT NULL,
    "user_id" uuid REFERENCES "users"("id"),
    "session_id" varchar(255),
    "event_data" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Bill tracking preferences
CREATE TABLE IF NOT EXISTS "bill_tracking_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "bill_id" uuid NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
    "tracking_enabled" boolean DEFAULT true,
    "notification_frequency" varchar(20) DEFAULT 'immediate',
    "preferences" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("user_id", "bill_id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("is_active");

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions"("expires_at");

CREATE INDEX IF NOT EXISTS "idx_bills_status" ON "bills"("status");
CREATE INDEX IF NOT EXISTS "idx_bills_sponsor_id" ON "bills"("sponsor_id");
CREATE INDEX IF NOT EXISTS "idx_bills_bill_number" ON "bills"("bill_number");
CREATE INDEX IF NOT EXISTS "idx_bills_search_vector" ON "bills" USING gin("search_vector");

CREATE INDEX IF NOT EXISTS "idx_sponsors_party" ON "sponsors"("party");
CREATE INDEX IF NOT EXISTS "idx_sponsors_state" ON "sponsors"("state");

CREATE INDEX IF NOT EXISTS "idx_comments_bill_id" ON "comments"("bill_id");
CREATE INDEX IF NOT EXISTS "idx_comments_user_id" ON "comments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_comments_parent_id" ON "comments"("parent_id");

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications"("is_read");

CREATE INDEX IF NOT EXISTS "idx_compliance_checks_entity" ON "compliance_checks"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_compliance_checks_status" ON "compliance_checks"("status");

CREATE INDEX IF NOT EXISTS "idx_security_events_type" ON "security_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_security_events_severity" ON "security_events"("severity");
CREATE INDEX IF NOT EXISTS "idx_security_events_created_at" ON "security_events"("created_at");

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON "user_profiles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON "sessions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON "bills"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON "sponsors"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON "comments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_verification_updated_at BEFORE UPDATE ON "user_verification"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_preferences_updated_at BEFORE UPDATE ON "alert_preferences"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_checks_updated_at BEFORE UPDATE ON "compliance_checks"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_tracking_preferences_updated_at BEFORE UPDATE ON "bill_tracking_preferences"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create search vector update function for bills
CREATE OR REPLACE FUNCTION update_bill_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.summary, '') || ' ' ||
        COALESCE(NEW.bill_number, '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bill_search_vector_trigger
    BEFORE INSERT OR UPDATE ON "bills"
    FOR EACH ROW EXECUTE FUNCTION update_bill_search_vector();
