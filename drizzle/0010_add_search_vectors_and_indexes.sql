-- Migration: Add search vectors and performance indexes
-- This migration adds full-text search capabilities and performance indexes

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
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Index for user profiles and interests
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_interest ON user_interests(user_id, interest);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bills_status_category_date ON bills(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_parent_created ON bill_comments(bill_id, parent_comment_id, created_at DESC);

-- ROLLBACK:
-- Remove search vector functionality
DROP TRIGGER IF EXISTS bills_search_vector_update ON bills;
DROP FUNCTION IF EXISTS update_bills_search_vector();
ALTER TABLE bills DROP COLUMN IF EXISTS search_vector;

-- Remove indexes
DROP INDEX IF EXISTS idx_bills_search_vector;
DROP INDEX IF EXISTS idx_bills_status_date;
DROP INDEX IF EXISTS idx_bills_category_date;
DROP INDEX IF EXISTS idx_bills_sponsor_status;
DROP INDEX IF EXISTS idx_bills_view_count;
DROP INDEX IF EXISTS idx_bill_comments_bill_created;
DROP INDEX IF EXISTS idx_bill_comments_user_created;
DROP INDEX IF EXISTS idx_bill_comments_parent;
DROP INDEX IF EXISTS idx_bill_comments_votes;
DROP INDEX IF EXISTS idx_bill_engagement_user_score;
DROP INDEX IF EXISTS idx_bill_engagement_bill_score;
DROP INDEX IF EXISTS idx_bill_engagement_last_engaged;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_type_created;
DROP INDEX IF EXISTS idx_sponsors_transparency_score;
DROP INDEX IF EXISTS idx_sponsors_conflict_level;
DROP INDEX IF EXISTS idx_sponsor_affiliations_active;
DROP INDEX IF EXISTS idx_bill_sponsorships_bill_type;
DROP INDEX IF EXISTS idx_bill_sponsorships_sponsor_active;
DROP INDEX IF EXISTS idx_users_email_active;
DROP INDEX IF EXISTS idx_users_verification_status;
DROP INDEX IF EXISTS idx_sessions_user_active;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_profiles_reputation;
DROP INDEX IF EXISTS idx_user_interests_user_interest;
DROP INDEX IF EXISTS idx_bills_status_category_date;
DROP INDEX IF EXISTS idx_bill_comments_bill_parent_created;
-- END ROLLBACK