-- ============================================================================
-- SimpleTool Foundation Schema Migration
-- Created: January 14, 2026
-- Purpose: Create core tables for Kenyan Legislative Engagement Platform
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "chamber" AS ENUM ('House', 'Senate', 'Both');
CREATE TYPE "party" AS ENUM ('Jubilee', 'ODM', 'ANC', 'Ford-K', 'Independent', 'Other');
CREATE TYPE "bill_status" AS ENUM ('introduced', 'committee', 'floor_debate', 'passed_house', 'passed_senate', 'passed', 'failed', 'signed', 'vetoed', 'override_attempt');
CREATE TYPE "user_role" AS ENUM ('citizen', 'legislator', 'expert', 'moderator', 'admin');
CREATE TYPE "kenyan_county" AS ENUM ('Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kericho', 'Nyeri', 'Muranga', 'Kiambu', 'Nanyuki', 'Isiolo', 'Marsabit', 'Wajir', 'Garissa', 'Lamu', 'Tana River', 'Taita Taveta', 'Kwale', 'Homabay', 'Migori', 'Nyamira', 'Kisii', 'Siaya', 'Bungoma', 'Busia', 'Vihiga', 'Kakamega', 'Kericho', 'Bomet', 'Narok', 'Kajiado', 'Makueni', 'Kitui', 'Machakos', 'Embu', 'Tharaka Nithi', 'Meru', 'Isiolo', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'West Pokot', 'Turkana', 'Samburu', 'Laikipia', 'Nyandarua', 'Murang''a');
CREATE TYPE "anonymity_level" AS ENUM ('fully_anonymous', 'username_only', 'verified_identity', 'public_profile');

-- ============================================================================
-- USERS TABLE - Core authentication and user profiles
-- ============================================================================

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'citizen',
  
  -- Kenya-specific
  "county" "kenyan_county",
  "constituency" VARCHAR(100),
  
  -- Verification & security
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verification_token" VARCHAR(64),
  "verification_expires_at" TIMESTAMP WITH TIME ZONE,
  "password_reset_token" VARCHAR(64),
  "password_reset_expires_at" TIMESTAMP WITH TIME ZONE,
  
  -- Two-factor auth
  "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  "two_factor_secret" VARCHAR(32),
  "backup_codes" JSONB,
  
  -- Security tracking
  "failed_login_attempts" SMALLINT NOT NULL DEFAULT 0,
  "account_locked_until" TIMESTAMP WITH TIME ZONE,
  "last_password_change" TIMESTAMP WITH TIME ZONE,
  
  -- Account lifecycle
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "last_login_at" TIMESTAMP WITH TIME ZONE,
  "last_login_ip" VARCHAR(45),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivation_reason" TEXT,
  "deactivated_at" TIMESTAMP WITH TIME ZONE
);

-- Users indexes
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_role_active" ON "users"("role", "is_active", "created_at" DESC) WHERE "is_active" = true;
CREATE INDEX "idx_users_county_active" ON "users"("county", "is_active", "constituency") WHERE "county" IS NOT NULL AND "is_active" = true;
CREATE INDEX "idx_users_last_login" ON "users"("last_login_at" DESC, "is_active") WHERE "is_active" = true;

-- ============================================================================
-- BILLS TABLE - Legislative documents
-- ============================================================================

CREATE TABLE "bills" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_number" VARCHAR(50) UNIQUE NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "description" TEXT,
  "summary" TEXT,
  "full_text" TEXT,
  "status" "bill_status" NOT NULL DEFAULT 'introduced',
  
  -- Chamber information
  "chamber" "chamber" DEFAULT 'Both',
  "introduced_date" TIMESTAMP WITH TIME ZONE,
  "session" VARCHAR(50),
  
  -- Metadata
  "sponsor_id" UUID,
  "co_sponsors" JSONB, -- Array of legislator IDs
  "tags" JSONB, -- Array of strings
  "policy_areas" JSONB, -- Array of policy area strings
  "constitutional_issues" JSONB,
  "financial_impact" TEXT,
  "government_bodies" JSONB,
  
  -- Tracking
  "view_count" INTEGER DEFAULT 0,
  "comment_count" INTEGER DEFAULT 0,
  "tracking_count" INTEGER DEFAULT 0,
  "urgency" VARCHAR(20), -- low, medium, high, critical
  "complexity" VARCHAR(20), -- low, medium, high, expert
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  
  FOREIGN KEY ("sponsor_id") REFERENCES "users"("id"),
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

-- Bills indexes
CREATE INDEX "idx_bills_status" ON "bills"("status");
CREATE INDEX "idx_bills_chamber" ON "bills"("chamber");
CREATE INDEX "idx_bills_introduced_date" ON "bills"("introduced_date" DESC);
CREATE INDEX "idx_bills_created_at" ON "bills"("created_at" DESC);
CREATE UNIQUE INDEX "idx_bills_number" ON "bills"("bill_number");

-- ============================================================================
-- COMMUNITIES TABLE - User groups around shared interests
-- ============================================================================

CREATE TABLE "communities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "slug" VARCHAR(255) UNIQUE,
  
  -- Visibility and access
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "member_count" INTEGER DEFAULT 0,
  "moderator_id" UUID,
  
  -- Metadata
  "topics" JSONB, -- Array of topic strings
  "tags" JSONB,
  "avatar_url" TEXT,
  "banner_url" TEXT,
  
  -- Governance
  "rules" TEXT,
  "posting_guidelines" TEXT,
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  
  FOREIGN KEY ("moderator_id") REFERENCES "users"("id"),
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

-- Communities indexes
CREATE INDEX "idx_communities_created_at" ON "communities"("created_at" DESC);
CREATE INDEX "idx_communities_is_public" ON "communities"("is_public");
CREATE UNIQUE INDEX "idx_communities_slug" ON "communities"("slug");

-- ============================================================================
-- COMMENTS TABLE - User discussions and debates
-- ============================================================================

CREATE TABLE "comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL,
  "community_id" UUID,
  "user_id" UUID NOT NULL,
  "parent_comment_id" UUID,
  
  -- Content
  "content" TEXT NOT NULL,
  "anonymity_level" "anonymity_level" NOT NULL DEFAULT 'verified_identity',
  
  -- Moderation
  "is_flagged" BOOLEAN DEFAULT false,
  "flag_reason" TEXT,
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMP WITH TIME ZONE,
  
  -- Engagement
  "upvote_count" INTEGER DEFAULT 0,
  "downvote_count" INTEGER DEFAULT 0,
  "reply_count" INTEGER DEFAULT 0,
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE,
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE
);

-- Comments indexes
CREATE INDEX "idx_comments_bill_id" ON "comments"("bill_id");
CREATE INDEX "idx_comments_user_id" ON "comments"("user_id");
CREATE INDEX "idx_comments_created_at" ON "comments"("created_at" DESC);
CREATE INDEX "idx_comments_parent" ON "comments"("parent_comment_id") WHERE "parent_comment_id" IS NOT NULL;

-- ============================================================================
-- BILL_TRACKING TABLE - Track user interest in specific bills
-- ============================================================================

CREATE TABLE "bill_tracking" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "bill_id" UUID NOT NULL,
  
  -- Tracking preference
  "is_tracking" BOOLEAN NOT NULL DEFAULT true,
  "notification_enabled" BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE("user_id", "bill_id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE
);

-- Bill tracking indexes
CREATE INDEX "idx_bill_tracking_user" ON "bill_tracking"("user_id");
CREATE INDEX "idx_bill_tracking_bill" ON "bill_tracking"("bill_id");

-- ============================================================================
-- COMMUNITY_MEMBERSHIP TABLE - Track user participation in communities
-- ============================================================================

CREATE TABLE "community_membership" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  
  -- Membership status
  "role" VARCHAR(50) NOT NULL DEFAULT 'member', -- member, moderator, admin
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "left_at" TIMESTAMP WITH TIME ZONE,
  
  UNIQUE("user_id", "community_id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE
);

-- Community membership indexes
CREATE INDEX "idx_community_membership_user" ON "community_membership"("user_id");
CREATE INDEX "idx_community_membership_community" ON "community_membership"("community_id");
CREATE INDEX "idx_community_membership_active" ON "community_membership"("is_active") WHERE "is_active" = true;

-- ============================================================================
-- SESSIONS TABLE - User authentication sessions
-- ============================================================================

CREATE TABLE "sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token" VARCHAR(255) UNIQUE NOT NULL,
  
  -- Session details
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "revoked_at" TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Sessions indexes
CREATE INDEX "idx_sessions_user" ON "sessions"("user_id");
CREATE INDEX "idx_sessions_token" ON "sessions"("token");
CREATE INDEX "idx_sessions_expires" ON "sessions"("expires_at") WHERE "revoked_at" IS NULL;

-- ============================================================================
-- AUDIT_LOG TABLE - Track all important actions
-- ============================================================================

CREATE TABLE "audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "action" VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(50),
  "resource_id" UUID,
  "details" JSONB,
  "ip_address" VARCHAR(45),
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Audit log indexes
CREATE INDEX "idx_audit_log_user" ON "audit_log"("user_id");
CREATE INDEX "idx_audit_log_action" ON "audit_log"("action");
CREATE INDEX "idx_audit_log_created_at" ON "audit_log"("created_at" DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE - User notifications and alerts
-- ============================================================================

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255),
  "message" TEXT,
  "data" JSONB,
  
  -- Status
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Notifications indexes
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read") WHERE "is_read" = false;
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at" DESC);

-- ============================================================================
-- VERIFICATION TABLE - Expert verification of bills
-- ============================================================================

CREATE TABLE "verifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL,
  "expert_id" UUID NOT NULL,
  
  -- Verification details
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "confidence_score" NUMERIC(3, 2), -- 0.00 to 1.00
  "analysis" TEXT,
  "flags" JSONB, -- Constitutional issues, implementation risks, etc.
  
  -- Audit
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE,
  FOREIGN KEY ("expert_id") REFERENCES "users"("id")
);

-- Verifications indexes
CREATE INDEX "idx_verifications_bill" ON "verifications"("bill_id");
CREATE INDEX "idx_verifications_expert" ON "verifications"("expert_id");
CREATE INDEX "idx_verifications_is_verified" ON "verifications"("is_verified");
