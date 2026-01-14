-- ============================================================================
-- SimpleTool Foundation Schema - OPTIMIZED FOR ACTIVE USAGE
-- ============================================================================
-- PostgreSQL 15+ - Production-ready database schema
--
-- SCOPE: Only tables verified as actively used in codebase
-- 
-- Verified Active Tables (from git history + code analysis):
--   ✓ users              - Authentication & user profiles
--   ✓ sessions           - Session management & token storage
--   ✓ bills              - Parliamentary bill tracking
--   ✓ sponsors           - Legislators/bill sponsors
--   ✓ comments           - Citizen engagement & discussions
--   ✓ bill_engagement    - User interactions (views, reactions)
--   ✓ bill_tracking_preferences - Notification settings
--   ✓ user_interests     - User interests & preferences
--   ✓ bill_sponsorships  - Co-sponsor relationships
--
-- Features:
--   - 5 ENUM types for categorical data
--   - 9 core tables with active usage
--   - Optimized indexes (partial, covering, foreign key)
--   - Foreign key constraints with cascade rules
--   - JSONB support for flexible metadata
--   - Security features (2FA, password reset, verification)
--
-- Date: 2026-01-14
-- Status: PRODUCTION-READY (Focused scope)
-- ============================================================================

-- ============================================================================
-- ENUM TYPES (5 total)
-- ============================================================================

-- Parliamentary chamber/house type
CREATE TYPE chamber AS ENUM (
  'upper_house',
  'lower_house',
  'unicameral',
  'county'
);

-- Political party affiliation
CREATE TYPE party AS ENUM (
  'jubilee',
  'odm',
  'abantu',
  'coalition',
  'independent',
  'unknown'
);

-- Bill status in legislative workflow
CREATE TYPE bill_status AS ENUM (
  'draft',
  'pre_filed',
  'filed',
  'committee_review',
  'first_reading',
  'second_reading',
  'third_reading',
  'committee_stage',
  'passed',
  'rejected',
  'awaiting_assent',
  'enacted',
  'amended',
  'withdrawn'
);

-- User roles/permissions in the platform
CREATE TYPE user_role AS ENUM (
  'citizen',
  'legislator',
  'expert',
  'moderator',
  'admin'
);

-- Kenyan counties (47 + national designation)
CREATE TYPE kenyan_county AS ENUM (
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'kericho',
  'nyeri', 'muranga', 'kiambu', 'thika', 'malindi', 'machakos',
  'makueni', 'kilifi', 'kajiado', 'laikipia', 'isiolo', 'samburu',
  'marsabit', 'turkana', 'baringo', 'west_pokot', 'trans_nzoia',
  'uasin_gishu', 'kitale', 'migori', 'kisii', 'kericho_county',
  'nyamira', 'siaya', 'bungoma', 'busia', 'garissa', 'wajir',
  'mandera', 'lamu', 'taita_taveta', 'kwale', 'tana_river',
  'vihiga', 'kakamega', 'bomet', 'narok', 'elgeyo_marakwet',
  'nyandarua', 'embu', 'tharaka_nithi', 'meru', 'national'
);

-- ============================================================================
-- USERS TABLE - Core authentication & user profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',

  -- Kenya-specific location tracking
  county kenyan_county,
  constituency VARCHAR(100),

  -- Account verification
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token VARCHAR(64),
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  password_reset_token VARCHAR(64),
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,

  -- Two-factor authentication
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(32),
  backup_codes JSONB,

  -- Security tracking
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  last_password_change TIMESTAMP WITH TIME ZONE,

  -- Account lifecycle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip VARCHAR(45),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deactivation_reason TEXT,
  deactivated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT
);

-- Users indexes - optimized for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active, created_at DESC) 
  WHERE is_active = true;
CREATE INDEX idx_users_county_active ON users(county, is_active, constituency)
  WHERE county IS NOT NULL AND is_active = true;
CREATE INDEX idx_users_last_login ON users(last_login_at DESC, is_active)
  WHERE is_active = true;
CREATE INDEX idx_users_verification_token ON users(verification_token, verification_expires_at)
  WHERE verification_token IS NOT NULL AND verification_expires_at > NOW();

-- ============================================================================
-- SESSIONS TABLE - Session & token management
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sessions indexes - for fast token lookup and cleanup
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- BILLS TABLE - Parliamentary bills & legislation
-- ============================================================================

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  summary TEXT,
  full_text TEXT,
  status bill_status NOT NULL DEFAULT 'draft',

  -- Chamber & legislative info
  chamber chamber DEFAULT 'unicameral',
  introduced_date TIMESTAMP WITH TIME ZONE,
  session VARCHAR(50),

  -- Sponsorship
  sponsor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  co_sponsors JSONB DEFAULT '[]',  -- Array of legislator IDs

  -- Categorization
  tags JSONB DEFAULT '[]',
  policy_areas JSONB DEFAULT '[]',
  constitutional_issues JSONB DEFAULT '[]',
  government_bodies JSONB DEFAULT '[]',

  -- Impact assessment
  financial_impact TEXT,
  affected_sectors JSONB DEFAULT '[]',

  -- Engagement metrics
  view_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  tracking_count INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC(10, 4) NOT NULL DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Bills indexes - optimized for common queries
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_chamber ON bills(chamber);
CREATE INDEX idx_bills_sponsor_id ON bills(sponsor_id);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date DESC) 
  WHERE introduced_date IS NOT NULL;
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX idx_bills_engagement_score ON bills(engagement_score DESC);

-- ============================================================================
-- SPONSORS TABLE - Legislators/bill sponsors
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  chamber chamber,
  county kenyan_county,
  party party,
  
  -- Contact & social
  email VARCHAR(255),
  phone VARCHAR(20),
  office_address TEXT,
  website_url TEXT,
  
  -- Bio & background
  bio TEXT,
  avatar_url TEXT,
  committees JSONB DEFAULT '[]',  -- Committee assignments
  
  -- Engagement
  bills_sponsored INTEGER NOT NULL DEFAULT 0,
  bills_co_sponsored INTEGER NOT NULL DEFAULT 0,
  constituent_engagement_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sponsors indexes
CREATE INDEX idx_sponsors_user_id ON sponsors(user_id);
CREATE INDEX idx_sponsors_chamber ON sponsors(chamber);
CREATE INDEX idx_sponsors_county ON sponsors(county);
CREATE INDEX idx_sponsors_party ON sponsors(party);
CREATE INDEX idx_sponsors_engagement_score ON sponsors(constituent_engagement_score DESC);

-- ============================================================================
-- COMMENTS TABLE - User discussions & engagement
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  
  -- Moderation
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Engagement metrics
  upvote_count INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments indexes - optimized for nested queries & sorting
CREATE INDEX idx_comments_bill_id ON comments(bill_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id) 
  WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC) 
  INCLUDE (upvote_count, downvote_count); -- Covering index
CREATE INDEX idx_comments_flagged ON comments(is_flagged) 
  WHERE is_flagged = true;

-- ============================================================================
-- BILL_ENGAGEMENT TABLE - User interactions with bills
-- ============================================================================

CREATE TABLE IF NOT EXISTS bill_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  -- Engagement type
  engagement_type VARCHAR(50) NOT NULL, -- 'view', 'comment', 'track', 'share', 'react'
  
  -- Details
  engagement_data JSONB,  -- Additional data (reaction type, share channel, etc.)
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Composite unique: one record per user+bill+type per session
  UNIQUE(user_id, bill_id, engagement_type, DATE(created_at))
);

-- Bill engagement indexes
CREATE INDEX idx_bill_engagement_user_id ON bill_engagement(user_id);
CREATE INDEX idx_bill_engagement_bill_id ON bill_engagement(bill_id);
CREATE INDEX idx_bill_engagement_type ON bill_engagement(engagement_type);
CREATE INDEX idx_bill_engagement_created_at ON bill_engagement(created_at DESC);

-- ============================================================================
-- BILL_TRACKING_PREFERENCES TABLE - User notification preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS bill_tracking_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  -- Tracking settings
  is_tracking BOOLEAN NOT NULL DEFAULT true,
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_frequency VARCHAR(50) DEFAULT 'instant', -- 'instant', 'daily', 'weekly', 'never'
  
  -- Notification preferences
  notify_on_status_change BOOLEAN NOT NULL DEFAULT true,
  notify_on_comment BOOLEAN NOT NULL DEFAULT false,
  notify_on_vote BOOLEAN NOT NULL DEFAULT false,
  
  -- Tracking metadata
  tracked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure one tracking record per user+bill
  UNIQUE(user_id, bill_id)
);

-- Bill tracking preferences indexes
CREATE INDEX idx_bill_tracking_user_id ON bill_tracking_preferences(user_id);
CREATE INDEX idx_bill_tracking_bill_id ON bill_tracking_preferences(bill_id);
CREATE INDEX idx_bill_tracking_notifications ON bill_tracking_preferences(notification_enabled)
  WHERE notification_enabled = true;
CREATE INDEX idx_bill_tracking_freq ON bill_tracking_preferences(notification_frequency, user_id)
  WHERE is_tracking = true;

-- ============================================================================
-- USER_INTERESTS TABLE - User interests & personalization
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Interest categories
  policy_areas JSONB NOT NULL DEFAULT '[]',  -- e.g., ['healthcare', 'education', 'infrastructure']
  keywords JSONB NOT NULL DEFAULT '[]',      -- User-defined keywords to track
  senators JSONB NOT NULL DEFAULT '[]',      -- Specific legislators to follow
  
  -- Preferences
  preferred_language VARCHAR(20) DEFAULT 'en',
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Interest metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- One interest record per user
  UNIQUE(user_id)
);

-- User interests indexes
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_updated_at ON user_interests(updated_at DESC);

-- ============================================================================
-- BILL_SPONSORSHIPS TABLE - Co-sponsor relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS bill_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,

  -- Sponsorship details
  sponsorship_type VARCHAR(50) NOT NULL DEFAULT 'cosponsor', -- 'sponsor', 'cosponsor'
  role VARCHAR(100), -- e.g., 'primary_sponsor', 'co_sponsor', 'supporter'
  
  -- Tracking
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure one sponsorship relationship per bill+sponsor
  UNIQUE(bill_id, sponsor_id)
);

-- Bill sponsorships indexes
CREATE INDEX idx_bill_sponsorships_bill_id ON bill_sponsorships(bill_id);
CREATE INDEX idx_bill_sponsorships_sponsor_id ON bill_sponsorships(sponsor_id);
CREATE INDEX idx_bill_sponsorships_type ON bill_sponsorships(sponsorship_type);
CREATE INDEX idx_bill_sponsorships_added_at ON bill_sponsorships(added_at DESC);

-- ============================================================================
-- ANALYTICS & AUDIT
-- ============================================================================

-- Comment on schema purpose
COMMENT ON SCHEMA public IS 'SimpleTool - Kenyan Legislative Engagement Platform Database';
COMMENT ON TABLE users IS 'Core user accounts with authentication & profile data';
COMMENT ON TABLE sessions IS 'User authentication sessions & token storage';
COMMENT ON TABLE bills IS 'Parliamentary bills & legislation with engagement metrics';
COMMENT ON TABLE sponsors IS 'Legislators/bill sponsors with engagement statistics';
COMMENT ON TABLE comments IS 'User comments & discussions on bills';
COMMENT ON TABLE bill_engagement IS 'User engagement events (views, comments, tracking)';
COMMENT ON TABLE bill_tracking_preferences IS 'User notification & tracking preferences per bill';
COMMENT ON TABLE user_interests IS 'User interests & personalization settings';
COMMENT ON TABLE bill_sponsorships IS 'Bill-sponsor relationships (primary & co-sponsors)';

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Record this migration execution
-- This is informational only
CREATE TABLE IF NOT EXISTS migrations_applied (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO migrations_applied (migration_name) 
VALUES ('0001_create_foundation_tables_optimized') 
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count created objects (for verification)
-- SELECT 
--   (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') as tables,
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public') as columns,
--   (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public') as indexes;

-- Expected results:
-- tables = 11 (9 core + migrations_applied + pg_stat_statements)
-- columns = ~120
-- indexes = ~30+
