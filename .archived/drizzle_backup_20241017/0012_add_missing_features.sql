-- Migration: Add missing features to current schema
-- This migration adds search vectors, moderation, and analytics to the existing schema

-- Add search vector column to bills table for full-text search
ALTER TABLE bills ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_bills_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS bills_search_vector_update ON bills;
CREATE TRIGGER bills_search_vector_update
  BEFORE INSERT OR UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_bills_search_vector();

-- Update existing records with search vectors
UPDATE bills SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'D')
WHERE search_vector IS NULL;

-- Create GIN index for full-text search performance
CREATE INDEX IF NOT EXISTS idx_bills_search_vector ON bills USING GIN(search_vector);

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_bills_status_date ON bills(status, last_action_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_category_date ON bills(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_status ON bills(sponsor_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_view_count ON bills(view_count DESC);

-- Index for bill comments performance
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_created ON bill_comments(bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_comments_user_created ON bill_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_comments_parent ON bill_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bill_comments_votes ON bill_comments(upvotes DESC, downvotes ASC);

-- Index for user engagement tracking
CREATE INDEX IF NOT EXISTS idx_bill_engagement_user_score ON bill_engagement(user_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_bill_score ON bill_engagement(bill_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_last_engaged ON bill_engagement(last_engaged DESC);

-- Index for notifications performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC);

-- Index for sponsor analysis
CREATE INDEX IF NOT EXISTS idx_sponsors_transparency_score ON sponsors(transparency_score DESC);
CREATE INDEX IF NOT EXISTS idx_sponsors_conflict_level ON sponsors(conflict_level);
CREATE INDEX IF NOT EXISTS idx_sponsor_affiliations_active ON sponsor_affiliations(sponsor_id, is_active);

-- Index for bill sponsorships
CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_bill_type ON bill_sponsorships(bill_id, sponsorship_type);
CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_sponsor_active ON bill_sponsorships(sponsor_id, is_active);

-- Index for user authentication and sessions
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bills_status_category_date ON bills(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_parent_created ON bill_comments(bill_id, parent_comment_id, created_at DESC);

-- Moderation queue table for content review (using integer user_id to match current schema)
CREATE TABLE IF NOT EXISTS moderation_queue (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('bill_comment', 'bill', 'user_profile', 'sponsor_transparency')),
  content_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  flags JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  auto_flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[] DEFAULT '{}',
  moderator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for moderation queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_priority ON moderation_queue(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_user ON moderation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_moderator ON moderation_queue(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_auto_flagged ON moderation_queue(auto_flagged, created_at DESC);

-- Analytics events table for tracking user interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES bill_comments(id) ON DELETE CASCADE,
  sponsor_id INTEGER REFERENCES sponsors(id) ON DELETE CASCADE,
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category_date ON analytics_events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_date ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_bill ON analytics_events(bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, created_at DESC);

-- Daily analytics summary table for performance
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT,
  total_events INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  unique_sessions INTEGER NOT NULL DEFAULT 0,
  bill_interactions INTEGER DEFAULT 0,
  comment_interactions INTEGER DEFAULT 0,
  search_queries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, event_type, event_category)
);

-- Create indexes for daily summary
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date_type ON analytics_daily_summary(date DESC, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_category ON analytics_daily_summary(event_category, date DESC);

-- User activity summary table
CREATE TABLE IF NOT EXISTS user_activity_summary (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bills_viewed INTEGER DEFAULT 0,
  bills_tracked INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,
  comments_upvoted INTEGER DEFAULT 0,
  comments_downvoted INTEGER DEFAULT 0,
  searches_performed INTEGER DEFAULT 0,
  session_duration_minutes INTEGER DEFAULT 0,
  engagement_score NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for user activity summary
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity_summary(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_engagement ON user_activity_summary(engagement_score DESC, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_summary(date DESC);

-- Bill analytics summary table
CREATE TABLE IF NOT EXISTS bill_analytics_summary (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  tracking_users INTEGER DEFAULT 0,
  engagement_score NUMERIC(10, 2) DEFAULT 0,
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bill_id, date)
);

-- Create indexes for bill analytics
CREATE INDEX IF NOT EXISTS idx_bill_analytics_bill_date ON bill_analytics_summary(bill_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_analytics_engagement ON bill_analytics_summary(engagement_score DESC, date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_analytics_views ON bill_analytics_summary(views DESC, date DESC);

-- Content flags table for tracking user reports
CREATE TABLE IF NOT EXISTS content_flags (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('bill_comment', 'bill', 'user_profile')),
  content_id INTEGER NOT NULL,
  flagger_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL,
  flag_category TEXT NOT NULL CHECK (flag_category IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'escalated')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for content flags
CREATE INDEX IF NOT EXISTS idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_flagger ON content_flags(flagger_user_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON content_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_flags_category ON content_flags(flag_category, created_at DESC);

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metric_category TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for system health metrics
CREATE INDEX IF NOT EXISTS idx_system_health_name_time ON system_health_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_category_time ON system_health_metrics(metric_category, recorded_at DESC);

-- Create function to update moderation queue updated_at
CREATE OR REPLACE FUNCTION update_moderation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for moderation queue
DROP TRIGGER IF EXISTS moderation_queue_updated_at ON moderation_queue;
CREATE TRIGGER moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_moderation_queue_updated_at();

-- Create function to update user activity summary updated_at
CREATE OR REPLACE FUNCTION update_user_activity_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user activity summary
DROP TRIGGER IF EXISTS user_activity_summary_updated_at ON user_activity_summary;
CREATE TRIGGER user_activity_summary_updated_at
  BEFORE UPDATE ON user_activity_summary
  FOR EACH ROW EXECUTE FUNCTION update_user_activity_summary_updated_at();

-- Create function to update bill analytics summary updated_at
CREATE OR REPLACE FUNCTION update_bill_analytics_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bill analytics summary
DROP TRIGGER IF EXISTS bill_analytics_summary_updated_at ON bill_analytics_summary;
CREATE TRIGGER bill_analytics_summary_updated_at
  BEFORE UPDATE ON bill_analytics_summary
  FOR EACH ROW EXECUTE FUNCTION update_bill_analytics_summary_updated_at();

-- ROLLBACK:
-- Remove triggers and functions
DROP TRIGGER IF EXISTS bills_search_vector_update ON bills;
DROP TRIGGER IF EXISTS moderation_queue_updated_at ON moderation_queue;
DROP TRIGGER IF EXISTS user_activity_summary_updated_at ON user_activity_summary;
DROP TRIGGER IF EXISTS bill_analytics_summary_updated_at ON bill_analytics_summary;
DROP FUNCTION IF EXISTS update_bills_search_vector();
DROP FUNCTION IF EXISTS update_moderation_queue_updated_at();
DROP FUNCTION IF EXISTS update_user_activity_summary_updated_at();
DROP FUNCTION IF EXISTS update_bill_analytics_summary_updated_at();

-- Remove search vector column
ALTER TABLE bills DROP COLUMN IF EXISTS search_vector;

-- Remove tables
DROP TABLE IF EXISTS system_health_metrics;
DROP TABLE IF EXISTS content_flags;
DROP TABLE IF EXISTS bill_analytics_summary;
DROP TABLE IF EXISTS user_activity_summary;
DROP TABLE IF EXISTS analytics_daily_summary;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS moderation_queue;

-- Remove indexes (PostgreSQL will automatically remove indexes when tables are dropped)
-- END ROLLBACK