-- Migration 0020: Comprehensive Schema Normalization
-- This migration addresses naming inconsistencies, missing tables, and schema standardization

-- ============================================================================
-- PHASE 1: STANDARDIZE NAMING CONVENTIONS (PLURAL TABLE NAMES)
-- ============================================================================

-- Rename singular tables to plural (if they exist and aren't already plural)
-- Note: We'll use IF EXISTS to avoid errors if tables don't exist

-- Analysis -> analyses (if needed)
-- This table is already correctly named as 'analysis' (singular) which is acceptable

-- ============================================================================
-- PHASE 2: ADD MISSING CORE TABLES
-- ============================================================================

-- Create missing core tables that are referenced but don't exist

-- User verification requests table
CREATE TABLE IF NOT EXISTS user_verification_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL DEFAULT 'identity',
  status TEXT NOT NULL DEFAULT 'pending',
  documents JSONB DEFAULT '[]'::jsonb,
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill versions table (for tracking bill changes)
CREATE TABLE IF NOT EXISTS bill_versions (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  changes_summary TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bill_id, version_number)
);

-- Bill co-sponsors table (separate from main sponsorships)
CREATE TABLE IF NOT EXISTS bill_co_sponsors (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  support_level TEXT DEFAULT 'full',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(bill_id, sponsor_id)
);

-- Sponsor financial disclosures table
CREATE TABLE IF NOT EXISTS sponsor_financial_disclosures (
  id SERIAL PRIMARY KEY,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  disclosure_year INTEGER NOT NULL,
  asset_type TEXT NOT NULL,
  asset_description TEXT NOT NULL,
  estimated_value_min NUMERIC(12,2),
  estimated_value_max NUMERIC(12,2),
  income_source TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'in_app', 'sms', 'push'
  is_enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'never'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type, channel)
);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_configurations (
  id SERIAL PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3: STANDARDIZE COLUMN TYPES AND CONSTRAINTS
-- ============================================================================

-- Standardize timestamp columns to use TIMESTAMP WITH TIME ZONE
-- Update existing tables to use consistent timestamp types

-- Update bills table timestamps
ALTER TABLE bills 
  ALTER COLUMN introduced_date TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN last_action_date TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Update bill_comments table timestamps
ALTER TABLE bill_comments 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Update bill_engagement table timestamps
ALTER TABLE bill_engagement 
  ALTER COLUMN last_engaged TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Update sponsors table timestamps
ALTER TABLE sponsors 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Update users table timestamps
ALTER TABLE users 
  ALTER COLUMN last_login_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- PHASE 4: ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core performance indexes (without CONCURRENTLY for transaction compatibility)
CREATE INDEX IF NOT EXISTS idx_bills_status_created ON bills(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_category_status ON bills(category, status);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id ON bills(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bills_engagement_score ON bills(engagement_score DESC);

-- Comment-related indexes
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_user ON bill_comments(bill_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bill_comments_parent ON bill_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bill_comments_created ON bill_comments(created_at DESC);

-- Engagement indexes
CREATE INDEX IF NOT EXISTS idx_bill_engagement_user_score ON bill_engagement(user_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_bill_score ON bill_engagement(bill_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_last_engaged ON bill_engagement(last_engaged DESC);

-- Sponsor-related indexes
CREATE INDEX IF NOT EXISTS idx_sponsors_transparency_score ON sponsors(transparency_score DESC);
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_sponsor ON bill_sponsorships(sponsor_id, is_active);

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC);

-- ============================================================================
-- PHASE 5: ADD MISSING CONSTRAINTS AND RELATIONSHIPS
-- ============================================================================

-- Add foreign key constraints where missing
-- Note: Using IF NOT EXISTS equivalent by checking constraint existence

-- Add check constraints for data integrity
DO $$ 
BEGIN
  -- Bills status constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_status_check') THEN
    ALTER TABLE bills ADD CONSTRAINT bills_status_check 
    CHECK (status IN ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed', 'withdrawn'));
  END IF;

  -- User role constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('citizen', 'expert', 'moderator', 'admin', 'sponsor'));
  END IF;

  -- Verification status constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_verification_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_verification_status_check 
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));
  END IF;

  -- Comment type constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bill_comments_type_check') THEN
    ALTER TABLE bill_comments ADD CONSTRAINT bill_comments_type_check 
    CHECK (comment_type IN ('general', 'expert', 'concern', 'support', 'question'));
  END IF;

  -- Sponsorship type constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bill_sponsorships_type_check') THEN
    ALTER TABLE bill_sponsorships ADD CONSTRAINT bill_sponsorships_type_check 
    CHECK (sponsorship_type IN ('primary', 'co-sponsor', 'supporter'));
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: CREATE MISSING VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for bill summary with sponsor information
CREATE OR REPLACE VIEW bill_summary_view AS
SELECT 
  b.id,
  b.title,
  b.description,
  b.status,
  b.bill_number,
  b.category,
  b.view_count,
  b.share_count,
  b.comment_count,
  b.engagement_score,
  b.introduced_date,
  b.created_at,
  s.name as primary_sponsor_name,
  s.party as primary_sponsor_party,
  s.role as primary_sponsor_role,
  COUNT(DISTINCT bs.id) as co_sponsor_count,
  COUNT(DISTINCT bc.id) as total_comments,
  AVG(be.engagement_score) as avg_user_engagement
FROM bills b
LEFT JOIN sponsors s ON b.sponsor_id = s.id
LEFT JOIN bill_sponsorships bs ON b.id = bs.bill_id AND bs.sponsorship_type = 'co-sponsor' AND bs.is_active = true
LEFT JOIN bill_comments bc ON b.id = bc.bill_id AND bc.is_deleted = false
LEFT JOIN bill_engagement be ON b.id = be.bill_id
GROUP BY b.id, s.id;

-- View for user engagement summary
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  u.role,
  u.verification_status,
  COUNT(DISTINCT be.bill_id) as bills_engaged,
  COUNT(DISTINCT bc.id) as comments_posted,
  SUM(be.view_count) as total_views,
  AVG(be.engagement_score) as avg_engagement_score,
  MAX(be.last_engaged) as last_engagement,
  up.reputation_score
FROM users u
LEFT JOIN bill_engagement be ON u.id = be.user_id
LEFT JOIN bill_comments bc ON u.id = bc.user_id AND bc.is_deleted = false
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.is_active = true
GROUP BY u.id, up.reputation_score;

-- View for sponsor transparency summary
CREATE OR REPLACE VIEW sponsor_transparency_summary AS
SELECT 
  s.id,
  s.name,
  s.role,
  s.party,
  s.transparency_score,
  s.financial_exposure,
  COUNT(DISTINCT st.id) as disclosure_count,
  COUNT(DISTINCT sa.id) as affiliation_count,
  COUNT(DISTINCT bs.bill_id) as sponsored_bills_count,
  MAX(st.date_reported) as last_disclosure_date
FROM sponsors s
LEFT JOIN sponsor_transparency st ON s.id = st.sponsor_id
LEFT JOIN sponsor_affiliations sa ON s.id = sa.sponsor_id AND sa.is_active = true
LEFT JOIN bill_sponsorships bs ON s.id = bs.sponsor_id AND bs.is_active = true
WHERE s.is_active = true
GROUP BY s.id;

-- ============================================================================
-- PHASE 7: ADD TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update engagement scores
CREATE OR REPLACE FUNCTION update_bill_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update bill engagement score based on views, comments, and shares
  UPDATE bills 
  SET engagement_score = (
    COALESCE(view_count, 0) * 0.1 + 
    COALESCE(comment_count, 0) * 2.0 + 
    COALESCE(share_count, 0) * 1.5
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update bill engagement when comments are added/removed
DROP TRIGGER IF EXISTS update_bill_engagement_on_comment ON bill_comments;
CREATE TRIGGER update_bill_engagement_on_comment
  AFTER INSERT OR UPDATE OR DELETE ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_engagement_score();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_bill_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bills 
  SET comment_count = (
    SELECT COUNT(*) 
    FROM bill_comments 
    WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id) 
    AND is_deleted = false
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment counts
DROP TRIGGER IF EXISTS update_bill_comment_count_trigger ON bill_comments;
CREATE TRIGGER update_bill_comment_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_comment_count();

-- ============================================================================
-- PHASE 8: INSERT DEFAULT SYSTEM CONFIGURATIONS
-- ============================================================================

-- Insert default system configurations
INSERT INTO system_configurations (config_key, config_value, description, is_public) VALUES
('app.name', '"Chanuka Legislative Transparency Platform"', 'Application name', true),
('app.version', '"1.0.0"', 'Application version', true),
('features.comments_enabled', 'true', 'Enable/disable commenting system', false),
('features.notifications_enabled', 'true', 'Enable/disable notifications', false),
('features.analytics_enabled', 'true', 'Enable/disable analytics tracking', false),
('limits.max_comments_per_user_per_day', '50', 'Maximum comments per user per day', false),
('limits.max_bills_tracked_per_user', '100', 'Maximum bills a user can track', false),
('moderation.auto_flag_threshold', '0.8', 'Threshold for automatic content flagging', false),
('notifications.batch_size', '100', 'Batch size for notification processing', false),
('cache.default_ttl_seconds', '3600', 'Default cache TTL in seconds', false)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- PHASE 9: CREATE MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Materialized view for daily bill statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_bill_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as bills_created,
  COUNT(*) FILTER (WHERE status = 'introduced') as bills_introduced,
  COUNT(*) FILTER (WHERE status = 'passed') as bills_passed,
  AVG(engagement_score) as avg_engagement_score,
  SUM(view_count) as total_views,
  SUM(comment_count) as total_comments
FROM bills
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS daily_bill_stats_date_idx ON daily_bill_stats(date);

-- Materialized view for user activity statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_user_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as users_registered,
  COUNT(*) FILTER (WHERE verification_status = 'verified') as users_verified,
  COUNT(*) FILTER (WHERE role = 'expert') as experts_registered,
  COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_users_7d,
  COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '30 days') as active_users_30d
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS daily_user_stats_date_idx ON daily_user_stats(date);

-- ============================================================================
-- PHASE 10: CLEANUP AND OPTIMIZATION
-- ============================================================================

-- Update table statistics
ANALYZE bills;
ANALYZE bill_comments;
ANALYZE bill_engagement;
ANALYZE users;
ANALYZE sponsors;
ANALYZE notifications;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW daily_bill_stats;
REFRESH MATERIALIZED VIEW daily_user_stats;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO system_configurations (config_key, config_value, description, is_public) VALUES
('migration.last_major_migration', '"0020_comprehensive_schema_normalization"', 'Last major schema migration applied', false),
('migration.last_migration_date', to_jsonb(NOW()::text), 'Date of last major migration', false)
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

COMMIT;