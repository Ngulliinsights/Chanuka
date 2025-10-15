-- Migration: Add moderation queue and analytics tables
-- This migration adds content moderation and analytics tracking capabilities

-- Moderation queue table for content review
CREATE TABLE IF NOT EXISTS moderation_queue (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('bill_comment', 'bill', 'user_profile', 'sponsor_transparency')),
  content_id INTEGER NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flags JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  auto_flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[] DEFAULT '{}',
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  flagger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL,
  flag_category TEXT NOT NULL CHECK (flag_category IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'escalated')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
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
CREATE TRIGGER bill_analytics_summary_updated_at
  BEFORE UPDATE ON bill_analytics_summary
  FOR EACH ROW EXECUTE FUNCTION update_bill_analytics_summary_updated_at();

-- ROLLBACK:
-- Remove triggers and functions
DROP TRIGGER IF EXISTS moderation_queue_updated_at ON moderation_queue;
DROP TRIGGER IF EXISTS user_activity_summary_updated_at ON user_activity_summary;
DROP TRIGGER IF EXISTS bill_analytics_summary_updated_at ON bill_analytics_summary;
DROP FUNCTION IF EXISTS update_moderation_queue_updated_at();
DROP FUNCTION IF EXISTS update_user_activity_summary_updated_at();
DROP FUNCTION IF EXISTS update_bill_analytics_summary_updated_at();

-- Remove tables
DROP TABLE IF EXISTS system_health_metrics;
DROP TABLE IF EXISTS content_flags;
DROP TABLE IF EXISTS bill_analytics_summary;
DROP TABLE IF EXISTS user_activity_summary;
DROP TABLE IF EXISTS analytics_daily_summary;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS moderation_queue;
-- END ROLLBACK