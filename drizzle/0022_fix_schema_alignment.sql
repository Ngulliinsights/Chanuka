-- Schema Alignment Migration
-- This migration fixes the critical mismatches between schema definitions and database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- DROP EXISTING TABLES (if they exist from previous migration)
-- ============================================================================

DROP TABLE IF EXISTS "bill_tracking_preferences" CASCADE;
DROP TABLE IF EXISTS "analytics_events" CASCADE;
DROP TABLE IF EXISTS "security_events" CASCADE;
DROP TABLE IF EXISTS "compliance_checks" CASCADE;
DROP TABLE IF EXISTS "alert_preferences" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "user_verification" CASCADE;
DROP TABLE IF EXISTS "bill_engagement" CASCADE;
DROP TABLE IF EXISTS "comment_votes" CASCADE;
DROP TABLE IF EXISTS "comments" CASCADE;
DROP TABLE IF EXISTS "bill_cosponsors" CASCADE;
DROP TABLE IF EXISTS "bills" CASCADE;
DROP TABLE IF EXISTS "sponsors" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "user_profiles" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- ============================================================================
-- CREATE POSTGRESQL ENUMS (matching schema definitions)
-- ============================================================================

-- Core enums
CREATE TYPE user_role AS ENUM ('citizen', 'expert', 'admin', 'journalist', 'advocate');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');
CREATE TYPE bill_status AS ENUM ('introduced', 'committee', 'passed', 'failed', 'signed');
CREATE TYPE comment_type AS ENUM ('general', 'expert_analysis', 'concern', 'support');
CREATE TYPE vote_type AS ENUM ('up', 'down');
CREATE TYPE sponsorship_type AS ENUM ('primary', 'co_sponsor', 'supporter');
CREATE TYPE analysis_type AS ENUM ('constitutional', 'stakeholder', 'impact', 'complexity');
CREATE TYPE conflict_type AS ENUM ('constitutional', 'procedural', 'contradictory');
CREATE TYPE severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE stakeholder_type AS ENUM ('business', 'ngo', 'agency', 'individual');
CREATE TYPE affiliation_type AS ENUM ('economic', 'professional', 'advocacy', 'cultural');
CREATE TYPE affiliation_conflict_type AS ENUM ('financial', 'ownership', 'influence', 'representation', 'none', 'previous');
CREATE TYPE disclosure_type AS ENUM ('financial', 'business', 'family');
CREATE TYPE moderation_content_type AS ENUM ('comment', 'bill', 'user_profile', 'sponsor_transparency');
CREATE TYPE flag_type AS ENUM ('spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other');

-- Refined status enums
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed', 'escalated');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'contained', 'resolved', 'closed');
CREATE TYPE compliance_status AS ENUM ('pending', 'compliant', 'non_compliant', 'remediating');
CREATE TYPE evaluation_status AS ENUM ('pending', 'screening', 'interviewing', 'rejected', 'hired');

-- Additional enums
CREATE TYPE moderation_action_type AS ENUM ('warn', 'hide', 'delete', 'ban_user', 'verify', 'highlight');
CREATE TYPE security_result AS ENUM ('success', 'failure', 'blocked');
CREATE TYPE compliance_check_type AS ENUM ('gdpr', 'ccpa', 'sox', 'pci_dss', 'custom');
CREATE TYPE threat_type AS ENUM ('malicious_ip', 'bot', 'scanner');
CREATE TYPE threat_source AS ENUM ('internal', 'external_feed', 'manual');
CREATE TYPE regulation_status AS ENUM ('proposed', 'enacted', 'repealed');
CREATE TYPE sync_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE sync_error_level AS ENUM ('warning', 'error', 'critical');
CREATE TYPE conflict_resolution AS ENUM ('pending', 'automatic', 'manual');
CREATE TYPE notification_type AS ENUM ('bill_update', 'comment_reply', 'verification_status');
CREATE TYPE attack_pattern_type AS ENUM ('regex', 'behavioral', 'statistical');
CREATE TYPE security_alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE verification_type AS ENUM ('accuracy', 'constitutional', 'impact', 'stakeholder', 'community');

-- ============================================================================
-- CORE USER TABLES (matching schema.ts exactly)
-- ============================================================================

CREATE TABLE "user" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar(320) UNIQUE NOT NULL,
    "passwordHash" text NOT NULL,
    "firstName" text,
    "lastName" text,
    "name" text NOT NULL,
    "role" user_role NOT NULL DEFAULT 'citizen',
    "verificationStatus" verification_status NOT NULL DEFAULT 'pending',
    "preferences" jsonb DEFAULT '{}',
    "isActive" boolean NOT NULL DEFAULT true,
    "lastLoginAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_profile" (
    "id" serial PRIMARY KEY,
    "userId" uuid UNIQUE NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "bio" text,
    "avatarUrl" text,
    "expertise" text[] DEFAULT '{}',
    "location" text,
    "organization" text,
    "verificationDocuments" jsonb DEFAULT '[]',
    "reputationScore" integer NOT NULL DEFAULT 0,
    "isPublic" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "user_profile_reputation_check" CHECK ("reputationScore" >= 0)
);

CREATE TABLE "session" (
    "id" text PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "token" text,
    "refreshTokenHash" text,
    "expiresAt" timestamp with time zone NOT NULL,
    "refreshTokenExpiresAt" timestamp with time zone,
    "isActive" boolean NOT NULL DEFAULT true,
    "ipAddress" inet,
    "userAgent" text,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "refresh_token" (
    "id" serial PRIMARY KEY,
    "sessionId" text NOT NULL REFERENCES "session"("id") ON DELETE CASCADE,
    "tokenHash" text UNIQUE NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "isRevoked" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "password_reset" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "tokenHash" text UNIQUE NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "isUsed" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_social_profile" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "provider" text NOT NULL,
    "providerId" text NOT NULL,
    "username" text,
    "displayName" text,
    "avatarUrl" text,
    "accessToken" text,
    "refreshToken" text,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_interest" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "interest" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_progress" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "achievementType" text NOT NULL,
    "achievementValue" integer NOT NULL DEFAULT 0,
    "level" integer DEFAULT 1,
    "badge" text,
    "description" text NOT NULL,
    "recommendation" text,
    "unlockedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "user_progress_level_check" CHECK ("level" >= 1),
    CONSTRAINT "user_progress_value_check" CHECK ("achievementValue" >= 0)
);

-- ============================================================================
-- LEGISLATIVE CONTENT TABLES
-- ============================================================================

CREATE TABLE "sponsor" (
    "id" serial PRIMARY KEY,
    "name" text NOT NULL,
    "role" text NOT NULL,
    "party" text,
    "constituency" text,
    "email" varchar(320),
    "phone" text,
    "bio" text,
    "photoUrl" text,
    "conflictLevel" severity DEFAULT 'low',
    "financialExposure" numeric(12, 2) DEFAULT 0,
    "votingAlignment" numeric(5, 2) DEFAULT 0,
    "transparencyScore" numeric(5, 2) DEFAULT 0,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "bill" (
    "id" serial PRIMARY KEY,
    "title" text NOT NULL,
    "description" text,
    "content" text,
    "summary" text,
    "status" bill_status NOT NULL DEFAULT 'introduced',
    "billNumber" text UNIQUE,
    "sponsorId" integer REFERENCES "sponsor"("id") ON DELETE SET NULL,
    "category" text,
    "viewCount" integer NOT NULL DEFAULT 0,
    "shareCount" integer NOT NULL DEFAULT 0,
    "commentCountCached" integer NOT NULL DEFAULT 0,
    "engagementScore" numeric(10, 2) NOT NULL DEFAULT 0,
    "complexityScore" integer,
    "constitutionalConcerns" jsonb DEFAULT '[]',
    "stakeholderAnalysis" jsonb DEFAULT '{}',
    "introducedDate" timestamp with time zone,
    "lastActionDate" timestamp with time zone,
    "searchVector" text,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "bill_complexity_check" CHECK ("complexityScore" IS NULL OR ("complexityScore" >= 1 AND "complexityScore" <= 10)),
    CONSTRAINT "bill_counts_check" CHECK ("viewCount" >= 0 AND "shareCount" >= 0 AND "commentCountCached" >= 0)
);

CREATE TABLE "bill_tag" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "tag" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "bill_sponsorship" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "sponsorId" integer NOT NULL REFERENCES "sponsor"("id") ON DELETE CASCADE,
    "sponsorshipType" sponsorship_type NOT NULL,
    "sponsorshipDate" timestamp with time zone NOT NULL DEFAULT now(),
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "bill_comment" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "commentType" comment_type NOT NULL DEFAULT 'general',
    "isVerified" boolean NOT NULL DEFAULT false,
    "parentCommentId" integer REFERENCES "bill_comment"("id") ON DELETE CASCADE,
    "upvotes" integer NOT NULL DEFAULT 0,
    "downvotes" integer NOT NULL DEFAULT 0,
    "isDeleted" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "bill_comment_votes_check" CHECK ("upvotes" >= 0 AND "downvotes" >= 0)
);

CREATE TABLE "comment_vote" (
    "id" serial PRIMARY KEY,
    "commentId" integer NOT NULL REFERENCES "bill_comment"("id") ON DELETE CASCADE,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "voteType" vote_type NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "bill_engagement" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "viewCount" integer NOT NULL DEFAULT 0,
    "commentCount" integer NOT NULL DEFAULT 0,
    "shareCount" integer NOT NULL DEFAULT 0,
    "engagementScore" numeric(10, 2) NOT NULL DEFAULT 0,
    "lastEngagedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "bill_engagement_counts_check" CHECK ("viewCount" >= 0 AND "commentCount" >= 0 AND "shareCount" >= 0)
);

CREATE TABLE "user_bill_tracking_preference" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "trackingTypes" text[] NOT NULL DEFAULT ARRAY['status_changes', 'new_comments']::text[],
    "alertFrequency" text NOT NULL DEFAULT 'immediate',
    "alertChannels" text[] NOT NULL DEFAULT ARRAY['in_app', 'email']::text[],
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "social_share" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "platform" text NOT NULL,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "metadata" jsonb DEFAULT '{}',
    "sharedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "likes" integer NOT NULL DEFAULT 0,
    "shares" integer NOT NULL DEFAULT 0,
    "comments" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "social_share_counts_check" CHECK ("likes" >= 0 AND "shares" >= 0 AND "comments" >= 0)
);

-- ============================================================================
-- ANALYSIS AND VERIFICATION TABLES
-- ============================================================================

CREATE TABLE "analysis" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "analysisType" analysis_type NOT NULL,
    "results" jsonb DEFAULT '{}',
    "confidence" numeric(5, 4) DEFAULT 0,
    "modelVersion" text,
    "metadata" jsonb DEFAULT '{}',
    "isApproved" boolean NOT NULL DEFAULT false,
    "approvedBy" uuid REFERENCES "user"("id") ON DELETE SET NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "analysis_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

CREATE TABLE "content_analysis" (
    "id" serial PRIMARY KEY,
    "contentType" moderation_content_type NOT NULL,
    "contentId" integer NOT NULL,
    "toxicityScore" numeric(5, 4) NOT NULL DEFAULT 0,
    "spamScore" numeric(5, 4) NOT NULL DEFAULT 0,
    "sentimentScore" numeric(5, 4) NOT NULL DEFAULT 0.5,
    "readabilityScore" numeric(5, 4) NOT NULL DEFAULT 0.5,
    "flags" text[] DEFAULT '{}',
    "confidence" numeric(5, 4) NOT NULL DEFAULT 0.8,
    "modelVersion" text NOT NULL DEFAULT '1.0',
    "analyzedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "content_analysis_scores_check" CHECK (
        "toxicityScore" >= 0 AND "toxicityScore" <= 1 AND
        "spamScore" >= 0 AND "spamScore" <= 1 AND
        "sentimentScore" >= 0 AND "sentimentScore" <= 1 AND
        "readabilityScore" >= 0 AND "readabilityScore" <= 1 AND
        "confidence" >= 0 AND "confidence" <= 1
    )
);

CREATE TABLE "bill_section_conflict" (
    "id" serial PRIMARY KEY,
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "sectionNumber" text NOT NULL,
    "conflictType" conflict_type NOT NULL,
    "severity" severity NOT NULL,
    "description" text NOT NULL,
    "recommendation" text,
    "isResolved" boolean NOT NULL DEFAULT false,
    "detectedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "verification" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "billId" integer NOT NULL REFERENCES "bill"("id") ON DELETE CASCADE,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "userRole" user_role NOT NULL,
    "verificationType" verification_type NOT NULL,
    "verificationStatus" verification_status NOT NULL DEFAULT 'pending',
    "confidence" numeric(5, 4) NOT NULL DEFAULT 0,
    "evidence" jsonb DEFAULT '[]',
    "expertise" jsonb DEFAULT '{}',
    "reasoning" text,
    "feedback" text,
    "endorsements" integer NOT NULL DEFAULT 0,
    "disputes" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "verification_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1),
    CONSTRAINT "verification_counts_check" CHECK ("endorsements" >= 0 AND "disputes" >= 0)
);

-- ============================================================================
-- STAKEHOLDER AND SPONSOR ANALYSIS
-- ============================================================================

CREATE TABLE "stakeholder" (
    "id" serial PRIMARY KEY,
    "name" text NOT NULL,
    "email" text,
    "organization" text,
    "sector" text,
    "type" stakeholder_type NOT NULL,
    "influence" numeric(5, 2) NOT NULL DEFAULT 0.00,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "stakeholder_influence_check" CHECK ("influence" >= 0 AND "influence" <= 100)
);

CREATE TABLE "sponsor_affiliation" (
    "id" serial PRIMARY KEY,
    "sponsorId" integer NOT NULL REFERENCES "sponsor"("id") ON DELETE CASCADE,
    "organizationName" text NOT NULL,
    "affiliationType" affiliation_type NOT NULL,
    "conflictType" affiliation_conflict_type NOT NULL DEFAULT 'none',
    "startDate" date,
    "endDate" date,
    "description" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "sponsor_transparency" (
    "id" serial PRIMARY KEY,
    "sponsorId" integer NOT NULL REFERENCES "sponsor"("id") ON DELETE CASCADE,
    "disclosureType" disclosure_type NOT NULL,
    "disclosureData" jsonb NOT NULL DEFAULT '{}',
    "reportingPeriod" text,
    "isVerified" boolean NOT NULL DEFAULT false,
    "verifiedBy" uuid REFERENCES "user"("id") ON DELETE SET NULL,
    "verifiedAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

CREATE TABLE "notification" (
    "id" serial PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "type" notification_type NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "data" jsonb DEFAULT '{}',
    "isRead" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "readAt" timestamp with time zone
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX "user_email_idx" ON "user"("email");
CREATE INDEX "user_role_idx" ON "user"("role");
CREATE INDEX "user_active_verified_idx" ON "user"("isActive", "verificationStatus");
CREATE INDEX "user_created_at_idx" ON "user"("createdAt");

-- User profile indexes
CREATE UNIQUE INDEX "user_profile_user_id_idx" ON "user_profile"("userId");
CREATE INDEX "user_profile_reputation_idx" ON "user_profile"("reputationScore");
CREATE INDEX "user_profile_public_idx" ON "user_profile"("isPublic");
CREATE INDEX "user_profile_expertise_idx" ON "user_profile" USING gin("expertise");

-- Session indexes
CREATE INDEX "session_user_id_idx" ON "session"("userId");
CREATE INDEX "session_active_expires_idx" ON "session"("isActive", "expiresAt");

-- Bill indexes
CREATE INDEX "bill_status_idx" ON "bill"("status");
CREATE INDEX "bill_category_idx" ON "bill"("category");
CREATE INDEX "bill_sponsor_id_idx" ON "bill"("sponsorId");
CREATE INDEX "bill_engagement_score_idx" ON "bill"("engagementScore");
CREATE INDEX "bill_introduced_date_idx" ON "bill"("introducedDate");
CREATE INDEX "bill_status_category_idx" ON "bill"("status", "category");
CREATE INDEX "bill_recent_active_idx" ON "bill"("lastActionDate", "status");
CREATE INDEX "bill_view_count_idx" ON "bill"("viewCount");

-- Sponsor indexes
CREATE INDEX "sponsor_name_idx" ON "sponsor"("name");
CREATE INDEX "sponsor_party_idx" ON "sponsor"("party");
CREATE INDEX "sponsor_active_idx" ON "sponsor"("isActive");

-- Bill tag indexes
CREATE UNIQUE INDEX "bill_tag_bill_tag_idx" ON "bill_tag"("billId", "tag");
CREATE INDEX "bill_tag_tag_idx" ON "bill_tag"("tag");
CREATE INDEX "bill_tag_bill_id_idx" ON "bill_tag"("billId");

-- Bill sponsorship indexes
CREATE UNIQUE INDEX "bill_sponsorship_bill_sponsor_idx" ON "bill_sponsorship"("billId", "sponsorId");
CREATE INDEX "bill_sponsorship_sponsor_id_idx" ON "bill_sponsorship"("sponsorId");
CREATE INDEX "bill_sponsorship_active_idx" ON "bill_sponsorship"("isActive");
CREATE INDEX "bill_sponsorship_bill_active_idx" ON "bill_sponsorship"("billId", "isActive");

-- Comment indexes
CREATE INDEX "bill_comment_bill_id_idx" ON "bill_comment"("billId");
CREATE INDEX "bill_comment_user_id_idx" ON "bill_comment"("userId");
CREATE INDEX "bill_comment_parent_comment_id_idx" ON "bill_comment"("parentCommentId");
CREATE INDEX "bill_comment_created_at_idx" ON "bill_comment"("createdAt");
CREATE INDEX "bill_comment_bill_created_idx" ON "bill_comment"("billId", "createdAt");
CREATE INDEX "bill_comment_verified_idx" ON "bill_comment"("isVerified", "billId");

-- Comment vote indexes
CREATE UNIQUE INDEX "comment_vote_comment_user_idx" ON "comment_vote"("commentId", "userId");
CREATE INDEX "comment_vote_comment_id_idx" ON "comment_vote"("commentId");
CREATE INDEX "comment_vote_user_id_idx" ON "comment_vote"("userId");

-- Bill engagement indexes
CREATE UNIQUE INDEX "bill_engagement_bill_user_idx" ON "bill_engagement"("billId", "userId");
CREATE INDEX "bill_engagement_user_id_idx" ON "bill_engagement"("userId");
CREATE INDEX "bill_engagement_score_idx" ON "bill_engagement"("engagementScore");
CREATE INDEX "bill_engagement_last_engaged_idx" ON "bill_engagement"("lastEngagedAt");
CREATE INDEX "bill_engagement_user_engaged_idx" ON "bill_engagement"("userId", "lastEngagedAt");

-- Notification indexes
CREATE INDEX "notification_user_id_idx" ON "notification"("userId");
CREATE INDEX "notification_is_read_idx" ON "notification"("isRead");

-- ============================================================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE "user_social_profile" ADD CONSTRAINT "user_social_profile_user_provider_idx" UNIQUE ("userId", "provider");
ALTER TABLE "user_interest" ADD CONSTRAINT "user_interest_user_interest_idx" UNIQUE ("userId", "interest");
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_achievement_idx" UNIQUE ("userId", "achievementType");
ALTER TABLE "user_bill_tracking_preference" ADD CONSTRAINT "user_bill_preference_unique" UNIQUE ("userId", "billId");
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_bill_type_idx" UNIQUE ("billId", "analysisType");
ALTER TABLE "content_analysis" ADD CONSTRAINT "content_analysis_content_idx" UNIQUE ("contentType", "contentId");
ALTER TABLE "verification" ADD CONSTRAINT "verification_bill_user_type_idx" UNIQUE ("billId", "userId", "verificationType");

-- ============================================================================
-- CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON "user_profile" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_updated_at BEFORE UPDATE ON "bill" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsor_updated_at BEFORE UPDATE ON "sponsor" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_comment_updated_at BEFORE UPDATE ON "bill_comment" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON "user_progress" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bill_tracking_preference_updated_at BEFORE UPDATE ON "user_bill_tracking_preference" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_updated_at BEFORE UPDATE ON "analysis" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_analysis_updated_at BEFORE UPDATE ON "content_analysis" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_section_conflict_updated_at BEFORE UPDATE ON "bill_section_conflict" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON "verification" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholder_updated_at BEFORE UPDATE ON "stakeholder" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsor_affiliation_updated_at BEFORE UPDATE ON "sponsor_affiliation" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsor_transparency_updated_at BEFORE UPDATE ON "sponsor_transparency" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CREATE SEARCH VECTOR UPDATE FUNCTION FOR BILLS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bill_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW."searchVector" := to_tsvector('english', 
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."summary", '') || ' ' || 
        COALESCE(NEW."billNumber", '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bill_search_vector_trigger 
    BEFORE INSERT OR UPDATE ON "bill"
    FOR EACH ROW EXECUTE FUNCTION update_bill_search_vector();

-- ============================================================================
-- SEED INITIAL DATA (Optional)
-- ============================================================================

-- Insert a test user for validation
INSERT INTO "user" ("email", "passwordHash", "name", "role") VALUES 
('admin@example.com', '$2b$10$example_hash', 'System Admin', 'admin')
ON CONFLICT ("email") DO NOTHING;

-- Insert a test sponsor
INSERT INTO "sponsor" ("name", "role", "party") VALUES 
('Test Sponsor', 'Senator', 'Independent')
ON CONFLICT DO NOTHING;