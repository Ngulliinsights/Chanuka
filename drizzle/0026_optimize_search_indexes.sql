-- ============================================================================
-- SEARCH OPTIMIZATION MIGRATION
-- ============================================================================
-- Adds trigram indexes and optimizes full-text search for simple matching engine
-- Replaces LIKE queries with proper PostgreSQL full-text search capabilities

-- Enable pg_trgm extension for trigram similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TRIGRAM INDEXES FOR FUZZY MATCHING
-- ============================================================================

-- Bills table trigram indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_title_trgm 
ON bills USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_summary_trgm 
ON bills USING gin (summary gin_trgm_ops);

-- Sponsors table trigram indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsors_name_trgm 
ON sponsors USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsors_bio_trgm 
ON sponsors USING gin (bio gin_trgm_ops);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES WITH PROPER CONFIGURATION
-- ============================================================================

-- Bills full-text search index with combined title and summary
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_fulltext_search 
ON bills USING gin (
  to_tsvector('english', title || ' ' || COALESCE(summary, ''))
);

-- Sponsors full-text search index with combined name and bio
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsors_fulltext_search 
ON sponsors USING gin (
  to_tsvector('english', name || ' ' || COALESCE(bio, ''))
);

-- ============================================================================
-- COMPOSITE INDEXES FOR FILTERED SEARCHES
-- ============================================================================

-- Bills: status + chamber + engagement for filtered full-text searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_search_filtered 
ON bills (status, chamber, engagement_score DESC) 
WHERE status IS NOT NULL;

-- Sponsors: chamber + county for filtered searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsors_search_filtered 
ON sponsors (chamber, county) 
WHERE chamber IS NOT NULL;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ============================================================================

-- Increase work_mem for better index creation and search performance
-- This is a session-level setting that will reset after migration
SET work_mem = '256MB';

-- Update table statistics for better query planning
ANALYZE bills;
ANALYZE sponsors;

-- ============================================================================
-- SEARCH PERFORMANCE FUNCTIONS
-- ============================================================================

-- Function to calculate combined relevance score
CREATE OR REPLACE FUNCTION calculate_search_relevance(
  title_text TEXT,
  content_text TEXT,
  search_query TEXT
) RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    ts_rank(
      to_tsvector('english', title_text || ' ' || COALESCE(content_text, '')),
      to_tsquery('english', search_query)
    ), 0
  ) + 
  COALESCE(
    GREATEST(
      similarity(title_text, search_query),
      similarity(COALESCE(content_text, ''), search_query)
    ), 0
  ) * 0.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- SEARCH CACHE TABLE FOR FREQUENTLY ACCESSED QUERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON search_cache (query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache (expires_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_search_cache() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_bills_title_trgm IS 'Trigram index for fuzzy matching on bill titles';
COMMENT ON INDEX idx_bills_summary_trgm IS 'Trigram index for fuzzy matching on bill summaries';
COMMENT ON INDEX idx_sponsors_name_trgm IS 'Trigram index for fuzzy matching on sponsor names';
COMMENT ON INDEX idx_sponsors_bio_trgm IS 'Trigram index for fuzzy matching on sponsor bios';
COMMENT ON INDEX idx_bills_fulltext_search IS 'Full-text search index for bills (title + summary)';
COMMENT ON INDEX idx_sponsors_fulltext_search IS 'Full-text search index for sponsors (name + bio)';
COMMENT ON FUNCTION calculate_search_relevance IS 'Combines full-text rank with trigram similarity for better search relevance';
COMMENT ON TABLE search_cache IS 'Cache table for frequently accessed search queries';