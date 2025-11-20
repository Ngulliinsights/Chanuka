-- Intelligent Search System - Phase 2: Core Integration
-- Enhanced PostgreSQL Full-Text Search with Dual-Engine Orchestration

-- ============================================================================
-- FULL-TEXT SEARCH VECTORS FOR EXISTING TABLES
-- ============================================================================

-- Add full-text search vectors to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS search_vector_updated_at TIMESTAMP WITH TIME ZONE;

-- Add full-text search vectors to sponsors table
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS search_vector_updated_at TIMESTAMP WITH TIME ZONE;

-- Add full-text search vectors to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector_updated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- WEIGHTED SEARCH VECTOR FUNCTIONS
-- ============================================================================

-- Function to create weighted search vector for bills
-- Title (A), Summary (B), Full Text (C), Tags (D)
CREATE OR REPLACE FUNCTION create_bill_search_vector(
  title TEXT,
  summary TEXT,
  full_text TEXT,
  tags TEXT[]
) RETURNS tsvector AS $$
DECLARE
  result tsvector := ''::tsvector;
BEGIN
  -- Title: Weight A (highest)
  IF title IS NOT NULL AND title != '' THEN
    result := result || setweight(to_tsvector('english', title), 'A');
  END IF;

  -- Summary: Weight B
  IF summary IS NOT NULL AND summary != '' THEN
    result := result || setweight(to_tsvector('english', summary), 'B');
  END IF;

  -- Full Text: Weight C
  IF full_text IS NOT NULL AND full_text != '' THEN
    result := result || setweight(to_tsvector('english', full_text), 'C');
  END IF;

  -- Tags: Weight D (lowest for metadata)
  IF tags IS NOT NULL AND array_length(tags, 1) > 0 THEN
    result := result || setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create weighted search vector for sponsors
-- Name (A), Bio (B)
CREATE OR REPLACE FUNCTION create_sponsor_search_vector(
  name TEXT,
  bio TEXT
) RETURNS tsvector AS $$
DECLARE
  result tsvector := ''::tsvector;
BEGIN
  -- Name: Weight A (highest)
  IF name IS NOT NULL AND name != '' THEN
    result := result || setweight(to_tsvector('english', name), 'A');
  END IF;

  -- Bio: Weight B
  IF bio IS NOT NULL AND bio != '' THEN
    result := result || setweight(to_tsvector('english', bio), 'B');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create weighted search vector for comments
-- Comment Text (A)
CREATE OR REPLACE FUNCTION create_comment_search_vector(
  comment_text TEXT
) RETURNS tsvector AS $$
BEGIN
  IF comment_text IS NOT NULL AND comment_text != '' THEN
    RETURN setweight(to_tsvector('english', comment_text), 'A');
  END IF;
  RETURN ''::tsvector;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATE EXISTING DATA WITH SEARCH VECTORS
-- ============================================================================

-- Update bills search vectors
UPDATE bills SET
  search_vector = create_bill_search_vector(title, summary, full_text, tags),
  search_vector_updated_at = NOW()
WHERE search_vector IS NULL OR search_vector_updated_at IS NULL;

-- Update sponsors search vectors
UPDATE sponsors SET
  search_vector = create_sponsor_search_vector(name, bio),
  search_vector_updated_at = NOW()
WHERE search_vector IS NULL OR search_vector_updated_at IS NULL;

-- Update comments search vectors
UPDATE comments SET
  search_vector = create_comment_search_vector(comment_text),
  search_vector_updated_at = NOW()
WHERE search_vector IS NULL OR search_vector_updated_at IS NULL;

-- ============================================================================
-- INDEXES FOR FULL-TEXT SEARCH PERFORMANCE
-- ============================================================================

-- GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_bills_search_vector ON bills USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_sponsors_search_vector ON sponsors USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_comments_search_vector ON comments USING gin(search_vector);

-- ============================================================================
-- TRIGGERS TO MAINTAIN SEARCH VECTORS
-- ============================================================================

-- Function to update search vector when content changes
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Update search vector based on table
  IF TG_TABLE_NAME = 'bills' THEN
    NEW.search_vector := create_bill_search_vector(NEW.title, NEW.summary, NEW.full_text, NEW.tags);
  ELSIF TG_TABLE_NAME = 'sponsors' THEN
    NEW.search_vector := create_sponsor_search_vector(NEW.name, NEW.bio);
  ELSIF TG_TABLE_NAME = 'comments' THEN
    NEW.search_vector := create_comment_search_vector(NEW.comment_text);
  END IF;

  NEW.search_vector_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for bills
DROP TRIGGER IF EXISTS trigger_bills_search_vector ON bills;
CREATE TRIGGER trigger_bills_search_vector
  BEFORE INSERT OR UPDATE OF title, summary, full_text, tags ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Triggers for sponsors
DROP TRIGGER IF EXISTS trigger_sponsors_search_vector ON sponsors;
CREATE TRIGGER trigger_sponsors_search_vector
  BEFORE INSERT OR UPDATE OF name, bio ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Triggers for comments
DROP TRIGGER IF EXISTS trigger_comments_search_vector ON comments;
CREATE TRIGGER trigger_comments_search_vector
  BEFORE INSERT OR UPDATE OF comment_text ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- ============================================================================
-- ADVANCED SEARCH FUNCTIONS
-- ============================================================================

-- Function for weighted ranking with custom weights
CREATE OR REPLACE FUNCTION advanced_ts_rank_cd(
  search_vector tsvector,
  query tsquery,
  weights real[4] DEFAULT '{0.1, 0.2, 0.4, 1.0}' -- A, B, C, D weights
) RETURNS real AS $$
BEGIN
  -- Use ts_rank_cd with normalization and custom weights
  RETURN ts_rank_cd(search_vector, query, 32, weights);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function for proximity search (phrases)
CREATE OR REPLACE FUNCTION proximity_search(
  search_vector tsvector,
  phrase TEXT,
  max_distance INTEGER DEFAULT 5
) RETURNS boolean AS $$
DECLARE
  words TEXT[];
  query_parts TEXT[];
  i INTEGER;
BEGIN
  -- Split phrase into words
  words := regexp_split_array(trim(phrase), '\s+');
  IF array_length(words, 1) < 2 THEN
    -- Single word, just check if it exists
    RETURN search_vector @@ plainto_tsquery('english', phrase);
  END IF;

  -- For phrases, check if words appear close together
  -- This is a simplified implementation - in production you might want more sophisticated proximity
  FOR i IN 1..array_length(words, 1) LOOP
    IF NOT (search_vector @@ plainto_tsquery('english', words[i])) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- SEARCH ANALYTICS ENHANCEMENTS
-- ============================================================================

-- Add search ranking weights to analytics
ALTER TABLE search_analytics ADD COLUMN IF NOT EXISTS semantic_weight DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE search_analytics ADD COLUMN IF NOT EXISTS traditional_weight DECIMAL(3,2) DEFAULT 0.3;
ALTER TABLE search_analytics ADD COLUMN IF NOT EXISTS recency_weight DECIMAL(3,2) DEFAULT 0.1;
ALTER TABLE search_analytics ADD COLUMN IF NOT EXISTS popularity_weight DECIMAL(3,2) DEFAULT 0.1;

-- Add query classification data
ALTER TABLE search_queries ADD COLUMN IF NOT EXISTS query_classification VARCHAR(50); -- 'semantic', 'traditional', 'hybrid', 'field_specific', 'boolean'
ALTER TABLE search_queries ADD COLUMN IF NOT EXISTS engine_used VARCHAR(50); -- 'postgresql', 'semantic', 'dual'
ALTER TABLE search_queries ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false;
ALTER TABLE search_queries ADD COLUMN IF NOT EXISTS ranking_weights JSONB DEFAULT '{"semantic": 0.7, "traditional": 0.3, "recency": 0.1, "popularity": 0.1}';

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE bills;
ANALYZE sponsors;
ANALYZE comments;
ANALYZE content_embeddings;
ANALYZE search_queries;
ANALYZE search_analytics;