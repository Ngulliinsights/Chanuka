-- =============================================
-- COMPLETE OPTIMIZED DATABASE SCHEMA
-- =============================================

-- =============================================
-- BASE TABLE DEFINITIONS WITH ENHANCEMENTS
-- =============================================

-- Users table with enhancements
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  reputation INTEGER DEFAULT 0 NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  -- Account status tracking
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  -- Soft delete functionality
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Password strength validation
  CONSTRAINT password_strength CHECK (length(password_hash) >= 60)
);

-- Create email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add email validation constraint
ALTER TABLE users ADD CONSTRAINT valid_email
  CHECK (is_valid_email(email));

-- Social profiles table
CREATE TABLE IF NOT EXISTS social_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  profile_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, platform),
  UNIQUE(platform, profile_id)
);

-- Bills table with enhancements
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  content TEXT,
  views INTEGER DEFAULT 0 NOT NULL,
  shares INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  -- Added tracking columns
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Denormalized counters
  comment_count INTEGER DEFAULT 0 NOT NULL,
  vote_count INTEGER DEFAULT 0 NOT NULL,
  -- Validation constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'proposed', 'active', 'passed', 'rejected', 'withdrawn'))
);

-- Bill tags table
CREATE TABLE IF NOT EXISTS bill_tags (
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (bill_id, tag)
);

-- Stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  influence VARCHAR(50) NOT NULL,
  sector VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT valid_influence CHECK (influence IN ('high', 'medium', 'low'))
);

-- Bill stakeholders junction table
CREATE TABLE IF NOT EXISTS bill_stakeholders (
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  stakeholder_id INTEGER NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  relationship VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (bill_id, stakeholder_id)
);

-- Bill comments table
CREATE TABLE IF NOT EXISTS bill_comments (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES bill_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  endorsements INTEGER DEFAULT 0 NOT NULL,
  highlighted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, type, achieved_at)
);

-- Social shares table
CREATE TABLE IF NOT EXISTS social_shares (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT valid_platform CHECK (platform IN ('twitter', 'facebook', 'linkedin', 'instagram', 'email', 'other'))
);

-- Bill votes table
CREATE TABLE IF NOT EXISTS bill_votes (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) NOT NULL,
  comment_id INTEGER REFERENCES bill_comments(id) ON DELETE SET NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT valid_vote_type CHECK (vote_type IN ('support', 'oppose', 'neutral')),
  UNIQUE(bill_id, user_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(10) NOT NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================
-- ADVANCED FUNCTION DEFINITIONS
-- =============================================

-- Create soft delete function for users
CREATE OR REPLACE FUNCTION soft_delete_user(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET
    deleted_at = CURRENT_TIMESTAMP,
    is_active = FALSE,
    deactivated_at = CURRENT_TIMESTAMP
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update bill last activity timestamp
CREATE OR REPLACE FUNCTION update_bill_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bills SET last_activity_at = CURRENT_TIMESTAMP WHERE id = NEW.bill_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to maintain comment count
CREATE OR REPLACE FUNCTION update_bill_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bills SET comment_count = comment_count + 1 WHERE id = NEW.bill_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bills SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.bill_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to maintain vote count
CREATE OR REPLACE FUNCTION update_bill_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bills SET vote_count = vote_count + 1 WHERE id = NEW.bill_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bills SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.bill_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create soft delete function for bills
CREATE OR REPLACE FUNCTION soft_delete_bill(bill_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE bills SET deleted_at = CURRENT_TIMESTAMP WHERE id = bill_id;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update bill shares count
CREATE OR REPLACE FUNCTION update_bill_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bills SET shares = shares + 1 WHERE id = NEW.bill_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to increment views
CREATE OR REPLACE FUNCTION increment_bill_views()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.views <> OLD.views THEN
    -- The view count was explicitly updated, so leave it alone
    RETURN NEW;
  ELSE
    -- Increment the view count
    NEW.views = OLD.views + 1;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update user last_active
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_row JSONB := NULL;
  new_row JSONB := NULL;
  current_user_id INTEGER := NULL;
BEGIN
  -- Try to get current user ID from session variable
  BEGIN
    current_user_id := current_setting('app.current_user_id')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    old_row = row_to_json(OLD)::JSONB;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    new_row = row_to_json(NEW)::JSONB;
  END IF;

  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    changed_by,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    current_user_id,
    old_row,
    new_row
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to set current user for row-level security
CREATE OR REPLACE FUNCTION set_current_user(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Create function for getting bill activity
CREATE OR REPLACE FUNCTION get_bill_activity(p_bill_id INTEGER)
RETURNS TABLE (
  comment_count BIGINT,
  vote_count BIGINT,
  share_count BIGINT,
  support_count BIGINT,
  oppose_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM bill_comments WHERE bill_id = p_bill_id) AS comment_count,
    (SELECT COUNT(*) FROM bill_votes WHERE bill_id = p_bill_id) AS vote_count,
    (SELECT COUNT(*) FROM social_shares WHERE bill_id = p_bill_id) AS share_count,
    (SELECT COUNT(*) FROM bill_votes WHERE bill_id = p_bill_id AND vote_type = 'support') AS support_count,
    (SELECT COUNT(*) FROM bill_votes WHERE bill_id = p_bill_id AND vote_type = 'oppose') AS oppose_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Create procedure for adding a new bill with tags
CREATE OR REPLACE PROCEDURE add_bill_with_tags(
  p_title VARCHAR(255),
  p_description TEXT,
  p_status VARCHAR(50),
  p_content TEXT,
  p_author_id INTEGER,
  p_tags VARCHAR[] -- Array of tags
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bill_id INTEGER;
  v_tag VARCHAR;
BEGIN
  -- Insert the bill
  INSERT INTO bills (
    title,
    description,
    status,
    proposed_date,
    content,
    author_id,
    last_activity_at
  )
  VALUES (
    p_title,
    p_description,
    p_status,
    CURRENT_TIMESTAMP,
    p_content,
    p_author_id,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_bill_id;

  -- Insert tags
  IF p_tags IS NOT NULL THEN
    FOREACH v_tag IN ARRAY p_tags
    LOOP
      INSERT INTO bill_tags (bill_id, tag)
      VALUES (v_bill_id, v_tag);
    END LOOP;
  END IF;
END;
$$;

-- Create procedure for voting on a bill
CREATE OR REPLACE PROCEDURE vote_on_bill(
  p_bill_id INTEGER,
  p_user_id INTEGER,
  p_vote_type VARCHAR(20),
  p_comment_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete any existing vote
  DELETE FROM bill_votes
  WHERE bill_id = p_bill_id AND user_id = p_user_id;

  -- Insert new vote
  INSERT INTO bill_votes (
    bill_id,
    user_id,
    vote_type,
    comment_id,
    voted_at
  )
  VALUES (
    p_bill_id,
    p_user_id,
    p_vote_type,
    p_comment_id,
    CURRENT_TIMESTAMP
  );

  -- Update user last active
  UPDATE users SET last_active = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
END;
$$;

-- Create procedure for adding a comment
CREATE OR REPLACE PROCEDURE add_bill_comment(
  p_bill_id INTEGER,
  p_user_id INTEGER,
  p_content TEXT,
  p_parent_id INTEGER DEFAULT NULL,
  OUT comment_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert comment
  INSERT INTO bill_comments (
    bill_id,
    user_id,
    parent_id,
    content,
    created_at
  )
  VALUES (
    p_bill_id,
    p_user_id,
    p_parent_id,
    p_content,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO comment_id;

  -- Update user last active
  UPDATE users SET last_active = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
END;
$$;

-- =============================================
-- SPECIALIZED QUERY FUNCTIONS
-- =============================================

-- Create function to get bills with filterable parameters
CREATE OR REPLACE FUNCTION get_bills_by_criteria(
  p_status VARCHAR[] DEFAULT NULL,
  p_tags VARCHAR[] DEFAULT NULL,
  p_after_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_before_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_author_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
  description TEXT,
  status VARCHAR,
  proposed_date TIMESTAMP WITH TIME ZONE,
  views INTEGER,
  shares INTEGER,
  comment_count INTEGER,
  vote_count INTEGER,
  author_name VARCHAR,
  tags VARCHAR[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.description,
    b.status,
    b.proposed_date,
    b.views,
    b.shares,
    b.comment_count,
    b.vote_count,
    u.username AS author_name,
    array_agg(DISTINCT bt.tag) AS tags
  FROM bills b
  LEFT JOIN users u ON b.author_id = u.id
  LEFT JOIN bill_tags bt ON b.id = bt.bill_id
  WHERE
    (p_status IS NULL OR b.status = ANY(p_status)) AND
    (p_tags IS NULL OR EXISTS (
      SELECT 1 FROM bill_tags bt2
      WHERE bt2.bill_id = b.id AND bt2.tag = ANY(p_tags)
    )) AND
    (p_after_date IS NULL OR b.proposed_date >= p_after_date) AND
    (p_before_date IS NULL OR b.proposed_date <= p_before_date) AND
    (p_author_id IS NULL OR b.author_id = p_author_id) AND
    (b.deleted_at IS NULL)
  GROUP BY
    b.id, b.title, b.description, b.status, b.proposed_date,
    b.views, b.shares, b.comment_count, b.vote_count, u.username
  ORDER BY b.proposed_date DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity(p_user_id INTEGER)
RETURNS TABLE (
  recent_comments JSONB[],
  recent_votes JSONB[],
  recent_shares JSONB[],
  total_comments INTEGER,
  total_votes INTEGER,
  total_shares INTEGER,
  authored_bills INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ARRAY(
      SELECT jsonb_build_object(
        'id', bc.id,
        'bill_id', bc.bill_id,
        'bill_title', b.title,
        'content', bc.content,
        'created_at', bc.created_at
      )
      FROM bill_comments bc
      JOIN bills b ON bc.bill_id = b.id
      WHERE bc.user_id = p_user_id
      ORDER BY bc.created_at DESC
      LIMIT 5
    ) AS recent_comments,

    ARRAY(
      SELECT jsonb_build_object(
        'id', bv.id,
        'bill_id', bv.bill_id,
        'bill_title', b.title,
        'vote_type', bv.vote_type,
        'voted_at', bv.voted_at
      )
      FROM bill_votes bv
      JOIN bills b ON bv.bill_id = b.id
      WHERE bv.user_id = p_user_id
      ORDER BY bv.voted_at DESC
      LIMIT 5
    ) AS recent_votes,

    ARRAY(
      SELECT jsonb_build_object(
        'id', ss.id,
        'bill_id', ss.bill_id,
        'bill_title', b.title,
        'platform', ss.platform,
        'shared_at', ss.shared_at
      )
      FROM social_shares ss
      JOIN bills b ON ss.bill_id = b.id
      WHERE ss.user_id = p_user_id
      ORDER BY ss.shared_at DESC
      LIMIT 5
    ) AS recent_shares,

    (SELECT COUNT(*) FROM bill_comments WHERE user_id = p_user_id) AS total_comments,
    (SELECT COUNT(*) FROM bill_votes WHERE user_id = p_user_id) AS total_votes,
    (SELECT COUNT(*) FROM social_shares WHERE user_id = p_user_id) AS total_shares,
    (SELECT COUNT(*) FROM bills WHERE author_id = p_user_id) AS authored_bills;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MATERIALIZED VIEWS AND INDEXING
-- =============================================

-- Create materialized view for active bills summary
CREATE MATERIALIZED VIEW IF NOT EXISTS active_bills_summary_mv AS
SELECT
  b.id,
  b.title,
  b.description,
  b.status,
  b.proposed_date,
  b.views,
  b.shares,
  b.comment_count,
  b.vote_count,
  u.username AS author_name,
  COUNT(DISTINCT ss.id) AS share_count,
  array_agg(DISTINCT bt.tag) AS tags
FROM
  bills b
LEFT JOIN
  users u ON b.author_id = u.id
LEFT JOIN
  social_shares ss ON b.id = ss.bill_id
LEFT JOIN
  bill_tags bt ON b.id = bt.bill_id
WHERE
  b.status IN ('proposed', 'active')
  AND b.deleted_at IS NULL
GROUP BY
  b.id, b.title, b.description, b.status, b.proposed_date, b.views,
  b.shares, b.comment_count, b.vote_count, u.username
ORDER BY
  b.proposed_date DESC;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bills_summary_id
  ON active_bills_summary_mv(id);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_active_bills_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_bills_summary_mv;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for user engagement metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_mv AS
SELECT
  u.id AS user_id,
  u.username,
  u.reputation,
  u.last_active,
  COUNT(DISTINCT bc.id) AS comments_posted,
  COUNT(DISTINCT bv.id) AS votes_cast,
  COUNT(DISTINCT ss.id) AS shares_made,
  COUNT(DISTINCT up.id) AS achievements,
  COUNT(DISTINCT b.id) AS bills_authored
FROM
  users u
LEFT JOIN
  bill_comments bc ON u.id = bc.user_id
LEFT JOIN
  bill_votes bv ON u.id = bv.user_id
LEFT JOIN
  social_shares ss ON u.id = ss.user_id
LEFT JOIN
  user_progress up ON u.id = up.user_id
LEFT JOIN
  bills b ON u.id = b.author_id
WHERE
  u.deleted_at IS NULL AND u.is_active = TRUE
GROUP BY
  u.id, u.username, u.reputation, u.last_active;

-- Create unique index on the user engagement materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_engagement_id
  ON user_engagement_mv(user_id);

-- Create refresh function for user engagement materialized view
CREATE OR REPLACE FUNCTION refresh_user_engagement()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_mv;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  PERFORM refresh_active_bills_summary();
  PERFORM refresh_user_engagement();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REGULAR VIEWS FOR COMMON QUERIES
-- =============================================

-- Create view for active users
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL AND is_active = TRUE;

-- Create optimized view for active bills
CREATE OR REPLACE VIEW active_bills_summary AS
SELECT
  b.id,
  b.title,
  b.status,
  b.proposed_date,
  b.views,
  b.shares,
  b.comment_count,
  b.vote_count,
  COUNT(DISTINCT ss.id) AS share_count
FROM
  bills b
LEFT JOIN
  social_shares ss ON b.id = ss.bill_id
WHERE
  b.status IN ('proposed', 'active')
  AND b.deleted_at IS NULL
GROUP BY
  b.id, b.title, b.status, b.proposed_date, b.views, b.shares,
  b.comment_count, b.vote_count
ORDER BY
  b.proposed_date DESC;

-- Create view for user engagement
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT
  u.id AS user_id,
  u.username,
  u.reputation,
  COUNT(DISTINCT bc.id) AS comments_posted,
  COUNT(DISTINCT bv.id) AS votes_cast,
  COUNT(DISTINCT ss.id) AS shares_made,
  COUNT(DISTINCT up.id) AS achievements,
  MAX(u.last_active) AS last_active
FROM
  users u
LEFT JOIN
  bill_comments bc ON u.id = bc.user_id
LEFT JOIN
  bill_votes bv ON u.id = bv.user_id
LEFT JOIN
  social_shares ss ON u.id = ss.user_id
LEFT JOIN
  user_progress up ON u.id = up.user_id
WHERE
  u.deleted_at IS NULL AND u.is_active = TRUE
GROUP BY
  u.id, u.username, u.reputation;

-- =============================================
-- INDEXING STRATEGY
-- =============================================

-- Create extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Primary indexes (automatically created by PostgreSQL)
-- Unique indexes (automatically created by PostgreSQL for UNIQUE constraints)

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_social_profiles_user ON social_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill ON bill_comments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_comments_user ON bill_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_comments_parent ON bill_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_type ON user_progress(user_id, type);
CREATE INDEX IF NOT EXISTS idx_social_shares_bill ON social_shares(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_votes_bill ON bill_votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_votes_user ON bill_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_stakeholders_stakeholder ON bill_stakeholders(stakeholder_id);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_proposed_date ON bills(proposed_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_bill_tags_tag ON bill_tags(tag);
CREATE INDEX IF NOT EXISTS idx_social_shares_platform ON social_shares(platform);
CREATE INDEX IF NOT EXISTS idx_bills_popularity ON bills(views DESC, shares DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholders_sector ON stakeholders(sector);
CREATE INDEX IF NOT EXISTS idx_user_progress_achieved_at ON user_progress(achieved_at DESC NULLS LAST);

-- Composite and covering indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_content ON bill_comments(bill_id, created_at DESC) INCLUDE (content);
CREATE INDEX IF NOT EXISTS idx_bill_comments_composite ON bill_comments(bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_stakeholders_composite ON bill_stakeholders(bill_id, stakeholder_id, relationship);
CREATE INDEX IF NOT EXISTS idx_social_profiles_composite ON social_profiles(user_id, platform);

-- Partial indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_active_bills ON bills(proposed_date DESC) WHERE status IN ('proposed', 'active') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recent_comments ON bill_comments(created_at DESC) WHERE created_at > (CURRENT_DATE - INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_user_activity ON users(last_active DESC) WHERE last_active > (CURRENT_DATE - INTERVAL '90 days') AND is_active = TRUE;

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_bills_content_gin ON bills USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_bills_title_description_gin ON bills USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Triggers for updated_at timestamp maintenance
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stakeholders_updated_at ON stakeholders;
CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for bill activity tracking
DROP TRIGGER IF EXISTS trigger_bill_last_activity_comments ON bill_comments;
CREATE TRIGGER trigger_bill_last_activity_comments
  AFTER INSERT OR UPDATE ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_last_activity();

DROP TRIGGER IF EXISTS trigger_bill_last_activity_votes ON bill_votes;
CREATE TRIGGER trigger_bill_last_activity_votes
  AFTER INSERT OR UPDATE ON bill_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_last_activity();

-- Triggers for denormalized counters
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_comment_count();

DROP TRIGGER IF EXISTS trigger_update_vote_count ON bill_votes;
CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON bill_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_vote_count();

DROP TRIGGER IF EXISTS trigger_update_shares_count ON social_shares;
CREATE TRIGGER trigger_update_shares_count
  AFTER INSERT ON social_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_shares_count();

-- Triggers for audit logging
DROP TRIGGER IF EXISTS audit_bills_trigger ON bills;
CREATE TRIGGER audit_bills_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bills
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_stakeholders_trigger ON stakeholders;
CREATE TRIGGER audit_stakeholders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stakeholders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_bill_votes_trigger ON bill_votes;
CREATE TRIGGER audit_bill_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bill_votes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger for bill views tracking
DROP TRIGGER IF EXISTS trigger_increment_views ON bills;
CREATE TRIGGER trigger_increment_views
  BEFORE UPDATE OF views ON bills
  FOR EACH ROW
  EXECUTE FUNCTION increment_bill_views();

-- Trigger for user activity tracking
DROP TRIGGER IF EXISTS trigger_update_user_last_active ON bill_comments;
CREATE TRIGGER trigger_update_user_last_active
  AFTER INSERT ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

DROP TRIGGER IF EXISTS trigger_update_user_last_active_votes ON bill_votes;
CREATE TRIGGER trigger_update_user_last_active_votes
  AFTER INSERT ON bill_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

DROP TRIGGER IF EXISTS trigger_update_user_last_active_shares ON social_shares;
CREATE TRIGGER trigger_update_user_last_active_shares
  AFTER INSERT ON social_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable row level security on bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policy for draft bills (only viewable by author)
DROP POLICY IF EXISTS draft_bills_policy ON bills;
CREATE POLICY draft_bills_policy ON bills
  FOR ALL
  USING (status != 'draft' OR author_id = current_setting('app.current_user_id', TRUE)::INTEGER);

-- Create policy to hide deleted bills
DROP POLICY IF EXISTS hide_deleted_bills_policy ON bills;
CREATE POLICY hide_deleted_bills_policy ON bills
  FOR ALL
  USING (deleted_at IS NULL);

-- =============================================
-- DATABASE MAINTENANCE FUNCTIONS
-- =============================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION clean_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < (CURRENT_DATE - (days_to_keep || ' days')::INTERVAL)
  RETURNING COUNT(*) INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze all tables
CREATE OR REPLACE FUNCTION analyze_all_tables()
RETURNS VOID AS $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE 'ANALYZE ' || tbl;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum the database
CREATE OR REPLACE FUNCTION vacuum_database()
RETURNS VOID AS $$
BEGIN
  -- Full vacuum requires exclusive lock
  VACUUM (ANALYZE, VERBOSE);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- NOTES:
-- 1. This schema implements full auditing, soft deletes, and optimized indexing
-- 2. Materialized views are used for frequently accessed summary data
-- 3. Row-level security is implemented for draft bills
-- 4. Triggers maintain denormalized counters and audit logs
-- 5. Functions are provided for maintenance and common operations
-- 6. All tables use timestamp with time zone for temporal data
-- 7. Proper foreign key constraints with appropriate ON DELETE actions
-- 8. Comprehensive indexing strategy for common queries
-- =============================================
