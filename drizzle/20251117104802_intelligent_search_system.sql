-- Intelligent Search System - Phase 1 Foundation Setup
-- Enables semantic search with AI embeddings and vector similarity

-- Enable PgVector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CONTENT EMBEDDINGS - Store AI-generated embeddings for searchable content
-- ============================================================================

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'bill', 'sponsor', 'comment'
  content_id UUID NOT NULL, -- References bills.id, sponsors.id, or comments.id
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for change detection

  -- AI embedding vector (OpenAI text-embedding-3-small produces 1536 dimensions)
  embedding vector(1536),

  -- Content metadata for efficient filtering
  content_title TEXT,
  content_summary TEXT,
  content_tags TEXT[],

  -- Processing metadata
  model_version VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
  processing_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for content embeddings
CREATE INDEX idx_content_embeddings_content_type_id ON content_embeddings(content_type, content_id);
CREATE INDEX idx_content_embeddings_processing_status ON content_embeddings(processing_status);
CREATE INDEX idx_content_embeddings_updated_at ON content_embeddings(updated_at);

-- Vector similarity search index (IVFFlat for good performance/recall balance)
CREATE INDEX idx_content_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Unique constraint to prevent duplicate embeddings
CREATE UNIQUE INDEX idx_content_embeddings_unique ON content_embeddings(content_type, content_id);

-- ============================================================================
-- SEARCH QUERIES - Track user search patterns and analytics
-- ============================================================================

CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Query details
  query_text TEXT NOT NULL,
  query_type VARCHAR(30) NOT NULL DEFAULT 'semantic', -- 'semantic', 'traditional', 'hybrid'
  search_filters JSONB DEFAULT '{}', -- Store filter parameters

  -- Query processing
  embedding vector(1536), -- Query embedding for semantic search
  processing_time_ms INTEGER, -- How long the search took

  -- Results metadata
  total_results INTEGER DEFAULT 0,
  relevant_results INTEGER DEFAULT 0,
  clicked_result_id UUID, -- Which result was clicked (if any)

  -- Geographic context
  user_county VARCHAR(50),
  user_constituency VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for search analytics
CREATE INDEX idx_search_queries_user_created ON search_queries(user_id, created_at);
CREATE INDEX idx_search_queries_type_created ON search_queries(query_type, created_at);
CREATE INDEX idx_search_queries_county ON search_queries(user_county);

-- ============================================================================
-- SEARCH ANALYTICS - Aggregate search performance and user behavior
-- ============================================================================

CREATE TABLE search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- Query volume metrics
  total_queries INTEGER NOT NULL DEFAULT 0,
  semantic_queries INTEGER NOT NULL DEFAULT 0,
  traditional_queries INTEGER NOT NULL DEFAULT 0,
  hybrid_queries INTEGER NOT NULL DEFAULT 0,

  -- Performance metrics
  avg_processing_time_ms INTEGER,
  avg_results_count DECIMAL(5,2),

  -- User engagement metrics
  click_through_rate DECIMAL(5,3), -- Percentage of queries with clicks
  avg_session_duration_seconds INTEGER,

  -- Geographic breakdown (top counties by search volume)
  top_search_counties JSONB DEFAULT '[]',

  -- Popular search terms
  popular_terms JSONB DEFAULT '[]',

  -- Content type distribution
  content_type_distribution JSONB DEFAULT '{}',

  -- Error tracking
  failed_queries INTEGER NOT NULL DEFAULT 0,
  error_rate DECIMAL(5,3),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE UNIQUE INDEX idx_search_analytics_date ON search_analytics(date);
CREATE INDEX idx_search_analytics_created_at ON search_analytics(created_at);

-- ============================================================================
-- ADD VECTOR COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add embedding columns to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(30) DEFAULT 'pending';

-- Add embedding columns to sponsors table
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(30) DEFAULT 'pending';

-- Add embedding columns to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(30) DEFAULT 'pending';

-- ============================================================================
-- INDEXES FOR VECTOR SEARCH PERFORMANCE
-- ============================================================================

-- Vector indexes for bills (IVFFlat with cosine similarity)
CREATE INDEX IF NOT EXISTS idx_bills_embedding ON bills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Vector indexes for sponsors
CREATE INDEX IF NOT EXISTS idx_sponsors_embedding ON sponsors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Vector indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_embedding ON comments USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Status indexes for embedding processing
CREATE INDEX IF NOT EXISTS idx_bills_embedding_status ON bills(embedding_status) WHERE embedding_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_sponsors_embedding_status ON sponsors(embedding_status) WHERE embedding_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_comments_embedding_status ON comments(embedding_status) WHERE embedding_status != 'completed';

-- ============================================================================
-- UPDATE TRIGGERS FOR EMBEDDING STATUS
-- ============================================================================

-- Function to update embedding status when content changes
CREATE OR REPLACE FUNCTION update_embedding_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark embedding as outdated when content changes
  NEW.embedding_status := 'pending';
  NEW.embedding_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for bills
DROP TRIGGER IF EXISTS trigger_bills_embedding_status ON bills;
CREATE TRIGGER trigger_bills_embedding_status
  BEFORE UPDATE OF title, summary, full_text ON bills
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_embedding_status();

-- Triggers for sponsors
DROP TRIGGER IF EXISTS trigger_sponsors_embedding_status ON sponsors;
CREATE TRIGGER trigger_sponsors_embedding_status
  BEFORE UPDATE OF name, bio ON sponsors
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_embedding_status();

-- Triggers for comments
DROP TRIGGER IF EXISTS trigger_comments_embedding_status ON comments;
CREATE TRIGGER trigger_comments_embedding_status
  BEFORE UPDATE OF comment_text ON comments
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_embedding_status();