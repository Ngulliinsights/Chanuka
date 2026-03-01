-- Migration: Create comments table for community feature
-- Date: 2026-03-01
-- Purpose: Enable community discussions on bills with voting

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 5000),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Voting
  upvotes INTEGER DEFAULT 0 CHECK (upvotes >= 0),
  downvotes INTEGER DEFAULT 0 CHECK (downvotes >= 0),
  
  -- Moderation
  is_verified BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_comments_bill_id ON comments(bill_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_user_id ON comments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_upvotes ON comments(upvotes DESC) WHERE is_deleted = FALSE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Comments
COMMENT ON TABLE comments IS 'User comments and discussions on bills';
COMMENT ON COLUMN comments.bill_id IS 'Reference to the bill being discussed';
COMMENT ON COLUMN comments.user_id IS 'User who created the comment';
COMMENT ON COLUMN comments.parent_id IS 'Parent comment for threaded discussions';
COMMENT ON COLUMN comments.is_verified IS 'Comment verified by moderators';
COMMENT ON COLUMN comments.is_flagged IS 'Comment flagged for review';
COMMENT ON COLUMN comments.is_deleted IS 'Soft delete flag';
