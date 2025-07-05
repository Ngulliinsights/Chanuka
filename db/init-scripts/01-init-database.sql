-- Initialize LegalEase Database with optimizations

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- Added for better password hashing

-- Create enum types for better data validation
CREATE TYPE user_role_enum AS ENUM ('admin', 'user', 'expert', 'stakeholder');
CREATE TYPE bill_status_enum AS ENUM ('draft', 'introduced', 'in_committee', 'passed_committee',
                                     'floor_vote', 'passed', 'enacted', 'vetoed');
CREATE TYPE stakeholder_type_enum AS ENUM ('individual', 'organization', 'government', 'corporation', 'ngo');
CREATE TYPE relationship_type_enum AS ENUM ('sponsor', 'advocate', 'opponent', 'neutral', 'author');
CREATE TYPE verification_status_enum AS ENUM ('pending', 'verified', 'rejected', 'needs_review');
CREATE TYPE notification_type_enum AS ENUM ('bill_update', 'comment', 'verification', 'system');

-- Create users table with enhanced constraints
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_name CHECK (length(trim(full_name)) > 0)
);

-- Create bills table with improved structure
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status bill_status_enum NOT NULL,
  introduced_date DATE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  document_url VARCHAR(255),
  sponsor VARCHAR(255),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  search_vector tsvector,
  current_version INTEGER DEFAULT 1,
  CONSTRAINT valid_title CHECK (length(trim(title)) > 0)
);

-- Create bill_versions table for tracking bill changes
CREATE TABLE IF NOT EXISTS bill_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  document_url VARCHAR(255),
  changes_summary TEXT,
  published_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content_hash VARCHAR(64),  -- For detecting duplicates
  UNIQUE(bill_id, version_number)
);

-- Create stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type stakeholder_type_enum NOT NULL,
  description TEXT,
  influence_level INTEGER CHECK (influence_level BETWEEN 1 AND 10),
  position VARCHAR(50),
  contact_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_stakeholder_name CHECK (length(trim(name)) > 0)
);

-- Create bill_stakeholders junction table
CREATE TABLE IF NOT EXISTS bill_stakeholders (
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  relationship_type relationship_type_enum NOT NULL,
  influence_score INTEGER CHECK (influence_score BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bill_id, stakeholder_id)
);

-- Create comments table with enhanced structure
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_expert_verified BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  CONSTRAINT valid_comment CHECK (length(trim(content)) > 0)
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  last_viewed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  bookmarked BOOLEAN DEFAULT FALSE,
  reminder_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bill_id)
);

-- Create expert_verifications table
CREATE TABLE IF NOT EXISTS expert_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  verification_status verification_status_enum NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  CONSTRAINT valid_content_type CHECK (content_type IN ('comment', 'bill', 'stakeholder'))
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type_enum NOT NULL,
  content TEXT NOT NULL,
  related_resource_id UUID,
  related_resource_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES users(id),
  changed_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Create text search configuration
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS english_kenyan ( COPY = english );

-- Create indexes for performance
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_tags ON bills USING GIN(tags);
CREATE INDEX idx_bills_metadata ON bills USING GIN(metadata);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX idx_comments_bill_id ON comments(bill_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_bill_id ON user_progress(bill_id);
CREATE INDEX idx_stakeholders_type ON stakeholders(type);
CREATE INDEX idx_expert_verifications_content ON expert_verifications(content_id, content_type);
CREATE INDEX idx_bill_versions_bill_id ON bill_versions(bill_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_log_record ON audit_log(table_name, record_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);

-- Create partial indexes for common queries
CREATE INDEX idx_bills_active ON bills(status) WHERE status IN ('introduced', 'in_committee', 'floor_vote');
CREATE INDEX idx_user_bookmarks ON user_progress(user_id, bill_id) WHERE bookmarked = TRUE;
CREATE INDEX idx_verified_comments ON comments(bill_id) WHERE is_expert_verified = TRUE;
CREATE INDEX idx_unread_notifications ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_active_sessions ON user_sessions(user_id) WHERE expires_at > CURRENT_TIMESTAMP;

-- Create covering indexes for common operations
CREATE INDEX idx_users_auth ON users(email, password_hash) INCLUDE (id, role, is_verified);
CREATE INDEX idx_comments_display ON comments(bill_id, created_at) INCLUDE (content, user_id, is_expert_verified);

-- Create text search index on bills
CREATE INDEX bills_search_idx ON bills USING GIN(search_vector);

-- Create update trigger for search vector
CREATE OR REPLACE FUNCTION bills_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english_kenyan', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english_kenyan', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english_kenyan', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER bills_search_vector_update_trigger
BEFORE INSERT OR UPDATE ON bills
FOR EACH ROW EXECUTE FUNCTION bills_search_vector_update();

-- Create trigger for updating timestamp columns
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_timestamp_trigger
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER stakeholders_timestamp_trigger
BEFORE UPDATE ON stakeholders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER comments_timestamp_trigger
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create trigger for audit logging
CREATE OR REPLACE FUNCTION audit_log_changes() RETURNS trigger AS $$
DECLARE
  audit_data JSONB;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    audit_data = to_jsonb(OLD);
    INSERT INTO audit_log (table_name, record_id, action, changed_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, audit_data);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    audit_data = jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'changed_fields', (SELECT jsonb_object_agg(key, value)
                         FROM jsonb_each(to_jsonb(NEW))
                         WHERE to_jsonb(NEW)->key != to_jsonb(OLD)->key)
    );
    INSERT INTO audit_log (table_name, record_id, action, changed_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, audit_data);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    audit_data = to_jsonb(NEW);
    INSERT INTO audit_log (table_name, record_id, action, changed_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, audit_data);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to key tables
CREATE TRIGGER bills_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON bills
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER stakeholders_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON stakeholders
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Create function for expired token cleanup
CREATE OR REPLACE FUNCTION clean_expired_tokens() RETURNS void AS $$
BEGIN
  -- Clean up password reset tokens
  UPDATE users SET
    reset_token = NULL,
    reset_token_expires = NULL
  WHERE reset_token_expires < CURRENT_TIMESTAMP;

  -- Clean up expired sessions
  DELETE FROM user_sessions
  WHERE expires_at < CURRENT_TIMESTAMP;

  -- Clean up expired notifications
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update search vectors
CREATE OR REPLACE FUNCTION refresh_search_vectors() RETURNS void AS $$
BEGIN
  UPDATE bills SET
    search_vector = setweight(to_tsvector('english_kenyan', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english_kenyan', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english_kenyan', COALESCE(array_to_string(tags, ' '), '')), 'C');
END;
$$ LANGUAGE plpgsql;

-- Create function for secure password updates
CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password_hash VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
  UPDATE users SET
    password_hash = new_password_hash,
    updated_at = CURRENT_TIMESTAMP,
    reset_token = NULL,
    reset_token_expires = NULL
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for user authentication
CREATE OR REPLACE FUNCTION authenticate_user(
  user_email VARCHAR(255),
  user_password VARCHAR(255)
) RETURNS TABLE (
  user_id UUID,
  user_role user_role_enum,
  is_user_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  UPDATE users
  SET last_login = CURRENT_TIMESTAMP
  WHERE email = user_email AND password_hash = crypt(user_password, password_hash)
  RETURNING id, role, is_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create helper functions for RLS
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role_enum AS $$
BEGIN
  RETURN current_setting('app.user_role', true)::user_role_enum;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
CREATE POLICY user_self_access ON users
  FOR ALL TO PUBLIC
  USING (id = current_user_id() OR current_user_role() IN ('admin'));

CREATE POLICY comments_read_access ON comments
  FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY comments_write_access ON comments
  FOR INSERT TO PUBLIC
  WITH CHECK (user_id = current_user_id());

CREATE POLICY comments_update_access ON comments
  FOR UPDATE TO PUBLIC
  USING (user_id = current_user_id() OR current_user_role() IN ('admin', 'expert'));

CREATE POLICY user_progress_access ON user_progress
  FOR ALL TO PUBLIC
  USING (user_id = current_user_id() OR current_user_role() IN ('admin'));

-- Create useful views
CREATE OR REPLACE VIEW active_bills AS
  SELECT * FROM bills
  WHERE status IN ('introduced', 'in_committee', 'floor_vote');

CREATE OR REPLACE VIEW popular_bills AS
  SELECT b.*, COUNT(DISTINCT up.user_id) AS viewer_count, COUNT(DISTINCT c.id) AS comment_count
  FROM bills b
  LEFT JOIN user_progress up ON b.id = up.bill_id
  LEFT JOIN comments c ON b.id = c.bill_id
  GROUP BY b.id
  ORDER BY viewer_count DESC, comment_count DESC;

CREATE OR REPLACE VIEW expert_comments AS
  SELECT c.*, u.full_name, u.role
  FROM comments c
  JOIN users u ON c.user_id = u.id
  WHERE c.is_expert_verified = TRUE OR u.role = 'expert';

-- Create materialized view for search optimization
CREATE MATERIALIZED VIEW search_index AS
  SELECT
    b.id,
    b.title,
    b.description,
    b.status,
    b.introduced_date,
    b.tags,
    b.search_vector,
    array_agg(DISTINCT s.name) AS stakeholder_names,
    COUNT(DISTINCT c.id) AS comment_count,
    COUNT(DISTINCT up.user_id) AS user_count
  FROM bills b
  LEFT JOIN bill_stakeholders bs ON b.id = bs.bill_id
  LEFT JOIN stakeholders s ON bs.stakeholder_id = s.id
  LEFT JOIN comments c ON b.id = c.bill_id
  LEFT JOIN user_progress up ON b.id = up.bill_id
  GROUP BY b.id, b.title, b.description, b.status, b.introduced_date, b.tags, b.search_vector;

CREATE UNIQUE INDEX search_index_id ON search_index(id);
CREATE INDEX search_index_vector ON search_index USING GIN(search_vector);
CREATE INDEX search_index_stakeholders ON search_index USING GIN(stakeholder_names);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_search_index() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_index;
END;
$$ LANGUAGE plpgsql;
