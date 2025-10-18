-- Comprehensive schema migration

-- Create custom enum types if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'influence_level') THEN
        CREATE TYPE "influence_level" AS ENUM ('high', 'medium', 'low');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'importance_level') THEN
        CREATE TYPE "importance_level" AS ENUM ('critical', 'important', 'normal');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_type') THEN
        CREATE TYPE "vote_type" AS ENUM ('yes', 'no', 'abstain');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
        CREATE TYPE "bill_status" AS ENUM ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'expert');
    END IF;
END $$;

-- Update users table with missing columns
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "role" user_role NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS "email" TEXT UNIQUE NOT NULL DEFAULT 'placeholder@example.com';

-- Create user_interests table
CREATE TABLE IF NOT EXISTS "user_interests" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "interest" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_interest_idx" ON "user_interests" ("user_id", "interest");

-- Create user_social_profiles table
CREATE TABLE IF NOT EXISTS "user_social_profiles" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "platform" VARCHAR(50) NOT NULL,
    "profile_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_platform_idx" ON "user_social_profiles" ("user_id", "platform");

-- Create bills table
CREATE TABLE IF NOT EXISTS "bills" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" bill_status NOT NULL DEFAULT 'draft',
    "proposed_date" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "content" TEXT NOT NULL,
    "view_count" INTEGER DEFAULT 0 NOT NULL,
    "share_count" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "date_introduced" TIMESTAMP WITH TIME ZONE,
    "voting_date" TIMESTAMP WITH TIME ZONE,
    "stakeholder_ids" INTEGER[],
    "requires_action" BOOLEAN DEFAULT FALSE,
    "urgency" TEXT,
    "due_date" TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS "bill_status_idx" ON "bills" ("status");
CREATE INDEX IF NOT EXISTS "proposed_date_idx" ON "bills" ("proposed_date");
CREATE INDEX IF NOT EXISTS "view_count_idx" ON "bills" ("view_count");
CREATE INDEX IF NOT EXISTS "bill_search_idx" ON "bills" ("title", "description");

-- Create bill_tags table
CREATE TABLE IF NOT EXISTS "bill_tags" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "tag" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_tag_idx" ON "bill_tags" ("bill_id", "tag");
CREATE INDEX IF NOT EXISTS "tag_idx" ON "bill_tags" ("tag");

-- Create bill_analysis table
CREATE TABLE IF NOT EXISTS "bill_analysis" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "brief_summary" TEXT,
    "standard_summary" TEXT,
    "comprehensive_summary" TEXT,
    "constitutional_confidence" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_analysis_idx" ON "bill_analysis" ("bill_id");

-- Create bill_key_provisions table
CREATE TABLE IF NOT EXISTS "bill_key_provisions" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "impact" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "bill_provision_idx" ON "bill_key_provisions" ("bill_id");

-- Create bill_timeline table
CREATE TABLE IF NOT EXISTS "bill_timeline" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "event_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "event" TEXT NOT NULL,
    "importance" importance_level NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "bill_timeline_idx" ON "bill_timeline" ("bill_id", "event_date");

-- Create stakeholders table
CREATE TABLE IF NOT EXISTS "stakeholders" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "influence" influence_level DEFAULT 'medium',
    "sector" TEXT,
    "biography" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "office" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "stakeholder_name_idx" ON "stakeholders" ("name");
CREATE INDEX IF NOT EXISTS "organization_idx" ON "stakeholders" ("organization");
CREATE INDEX IF NOT EXISTS "sector_idx" ON "stakeholders" ("sector");

-- Create bill_stakeholders table
CREATE TABLE IF NOT EXISTS "bill_stakeholders" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_stakeholder_idx" ON "bill_stakeholders" ("bill_id", "stakeholder_id");

-- Create stakeholder_relationships table
CREATE TABLE IF NOT EXISTS "stakeholder_relationships" (
    "id" SERIAL PRIMARY KEY,
    "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
    "related_stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id"),
    "relationship_type" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "relationship_idx" ON "stakeholder_relationships" ("stakeholder_id", "related_stakeholder_id");

-- Create stakeholder_impacts table
CREATE TABLE IF NOT EXISTS "stakeholder_impacts" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
    "impact" influence_level NOT NULL,
    "analysis" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_stakeholder_impact_idx" ON "stakeholder_impacts" ("bill_id", "stakeholder_id");

-- Create stakeholder_votes table
CREATE TABLE IF NOT EXISTS "stakeholder_votes" (
    "id" SERIAL PRIMARY KEY,
    "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "vote" vote_type NOT NULL,
    "vote_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "stakeholder_vote_idx" ON "stakeholder_votes" ("stakeholder_id", "bill_id");

-- Create bill_comments table
CREATE TABLE IF NOT EXISTS "bill_comments" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "expertise" TEXT,
    "verified_claims" INTEGER DEFAULT 0,
    "endorsements" INTEGER DEFAULT 0,
    "parent_id" INTEGER REFERENCES "bill_comments" ("id") ON DELETE SET NULL,
    "is_highlighted" BOOLEAN DEFAULT FALSE,
    "sentiment" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "bill_comment_idx" ON "bill_comments" ("bill_id");
CREATE INDEX IF NOT EXISTS "user_comment_idx" ON "bill_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "parent_comment_idx" ON "bill_comments" ("parent_id");

-- Create user_progress table
CREATE TABLE IF NOT EXISTS "user_progress" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "achievement_type" TEXT NOT NULL,
    "achievement_value" INTEGER NOT NULL,
    "level" INTEGER,
    "badge" TEXT,
    "description" TEXT,
    "unlocked_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_achievement_idx" ON "user_progress" ("user_id", "achievement_type");

-- Create user_flags table
CREATE TABLE IF NOT EXISTS "user_flags" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "content_type" TEXT NOT NULL,
    "content_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_flag_idx" ON "user_flags" ("user_id");
CREATE INDEX IF NOT EXISTS "content_flag_idx" ON "user_flags" ("content_type", "content_id");

-- Create bill_engagement table
CREATE TABLE IF NOT EXISTS "bill_engagement" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "view_count" INTEGER DEFAULT 0,
    "comment_count" INTEGER DEFAULT 0,
    "share_count" INTEGER DEFAULT 0,
    "engagement_score" FLOAT DEFAULT 0,
    "last_engaged" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_user_engagement_idx" ON "bill_engagement" ("bill_id", "user_id");
CREATE INDEX IF NOT EXISTS "engagement_score_idx" ON "bill_engagement" ("engagement_score");

-- Create bill_supporters table
CREATE TABLE IF NOT EXISTS "bill_supporters" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "support_level" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bill_supporter_idx" ON "bill_supporters" ("bill_id", "user_id");

-- Create functions and triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at columns
DO $$
DECLARE
    tables TEXT[] := ARRAY['users', 'bills', 'bill_analysis', 'stakeholders',
                          'stakeholder_impacts', 'bill_comments', 'user_flags', 'bill_engagement'];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- Record migration in drizzle_migrations table
INSERT INTO drizzle_migrations (hash, created_at)
VALUES ('0001_comprehensive_schema', NOW());
