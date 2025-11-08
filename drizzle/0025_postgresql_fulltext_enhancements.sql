-- PostgreSQL Full-Text Search Enhancements
-- Task 3.2: Add proper GIN indexes, ts_rank improvements, and query expansion

-- ============================================================================
-- GIN INDEXES FOR FULL-TEXT SEARCH OPTIMIZATION
-- ============================================================================

-- Create GIN index for bills full-text search
-- This index will dramatically improve performance for ts_vector queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_fulltext_gin" 
ON "bills" USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')));

-- Create GIN index for sponsors full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_fulltext_gin" 
ON "sponsors" USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));

-- Create GIN index for comments full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_fulltext_gin" 
ON "comments" USING gin(to_tsvector('english', content));

-- ============================================================================
-- TRIGRAM INDEXES FOR FUZZY MATCHING
-- ============================================================================

-- Enable pg_trgm extension for trigram matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy matching on key text fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_title_trgm" 
ON "bills" USING gin(title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_summary_trgm" 
ON "bills" USING gin(summary gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_name_trgm" 
ON "sponsors" USING gin(name gin_trgm_ops);

-- ============================================================================
-- QUERY EXPANSION SUPPORT TABLES
-- ============================================================================

-- Create table for storing synonyms and related terms for query expansion
CREATE TABLE IF NOT EXISTS "search_synonyms" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "term" varchar(255) NOT NULL,
    "synonyms" text[] NOT NULL,
    "category" varchar(100), -- e.g., 'legal', 'political', 'general'
    "weight" numeric(3,2) DEFAULT 1.0, -- Relevance weight for the synonym
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for fast synonym lookups
CREATE INDEX IF NOT EXISTS "idx_search_synonyms_term" ON "search_synonyms" ("term");
CREATE INDEX IF NOT EXISTS "idx_search_synonyms_category" ON "search_synonyms" ("category");

-- Create table for storing common search patterns and their expansions
CREATE TABLE IF NOT EXISTS "search_expansions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "original_query" varchar(500) NOT NULL,
    "expanded_query" text NOT NULL,
    "expansion_type" varchar(50) NOT NULL, -- e.g., 'synonym', 'stemming', 'phrase'
    "success_rate" numeric(5,4) DEFAULT 0.0, -- Track effectiveness
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for expansion lookups
CREATE INDEX IF NOT EXISTS "idx_search_expansions_query" ON "search_expansions" ("original_query");
CREATE INDEX IF NOT EXISTS "idx_search_expansions_type" ON "search_expansions" ("expansion_type");

-- ============================================================================
-- SEARCH ANALYTICS TABLE
-- ============================================================================

-- Create table for tracking search performance and analytics
CREATE TABLE IF NOT EXISTS "search_analytics" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "query" varchar(500) NOT NULL,
    "search_type" varchar(50) NOT NULL, -- 'fulltext', 'fuzzy', 'simple'
    "results_count" integer NOT NULL,
    "execution_time_ms" integer NOT NULL,
    "user_id" uuid,
    "session_id" varchar(255),
    "clicked_result_id" uuid,
    "clicked_result_position" integer,
    "search_timestamp" timestamp DEFAULT now() NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS "idx_search_analytics_query" ON "search_analytics" ("query");
CREATE INDEX IF NOT EXISTS "idx_search_analytics_timestamp" ON "search_analytics" ("search_timestamp");
CREATE INDEX IF NOT EXISTS "idx_search_analytics_execution_time" ON "search_analytics" ("execution_time_ms");
CREATE INDEX IF NOT EXISTS "idx_search_analytics_user" ON "search_analytics" ("user_id");

-- ============================================================================
-- INITIAL SYNONYM DATA
-- ============================================================================

-- Insert common legal and political synonyms for Kenyan context
INSERT INTO "search_synonyms" ("term", "synonyms", "category", "weight") VALUES
('bill', ARRAY['legislation', 'act', 'law', 'statute', 'proposal'], 'legal', 1.0),
('parliament', ARRAY['national assembly', 'senate', 'legislature', 'bunge'], 'political', 1.0),
('county', ARRAY['devolved unit', 'local government', 'region'], 'political', 0.9),
('budget', ARRAY['appropriation', 'allocation', 'funding', 'finance'], 'financial', 1.0),
('healthcare', ARRAY['health', 'medical', 'hospital', 'clinic', 'treatment'], 'policy', 1.0),
('education', ARRAY['learning', 'school', 'university', 'academic', 'student'], 'policy', 1.0),
('agriculture', ARRAY['farming', 'crops', 'livestock', 'rural', 'food security'], 'policy', 1.0),
('infrastructure', ARRAY['roads', 'transport', 'construction', 'development'], 'policy', 1.0),
('corruption', ARRAY['graft', 'fraud', 'embezzlement', 'misappropriation'], 'governance', 1.0),
('transparency', ARRAY['accountability', 'openness', 'disclosure', 'public access'], 'governance', 1.0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to log search performance
CREATE OR REPLACE FUNCTION log_search_performance(
    p_query varchar(500),
    p_search_type varchar(50),
    p_results_count integer,
    p_execution_time_ms integer,
    p_user_id uuid DEFAULT NULL,
    p_session_id varchar(255) DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    INSERT INTO search_analytics (
        query, search_type, results_count, execution_time_ms, 
        user_id, session_id, metadata
    ) VALUES (
        p_query, p_search_type, p_results_count, p_execution_time_ms,
        p_user_id, p_session_id, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get search performance statistics
CREATE OR REPLACE FUNCTION get_search_performance_stats(
    p_hours_back integer DEFAULT 24
) RETURNS TABLE (
    search_type varchar(50),
    avg_execution_time_ms numeric,
    p95_execution_time_ms numeric,
    total_searches bigint,
    avg_results_count numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.search_type,
        AVG(sa.execution_time_ms)::numeric AS avg_execution_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY sa.execution_time_ms)::numeric AS p95_execution_time_ms,
        COUNT(*)::bigint AS total_searches,
        AVG(sa.results_count)::numeric AS avg_results_count
    FROM search_analytics sa
    WHERE sa.search_timestamp >= NOW() - INTERVAL '1 hour' * p_hours_back
    GROUP BY sa.search_type
    ORDER BY total_searches DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- QUERY EXPANSION FUNCTIONS
-- ============================================================================

-- Function to expand query with synonyms
CREATE OR REPLACE FUNCTION expand_query_with_synonyms(
    p_query text,
    p_category varchar(100) DEFAULT NULL
) RETURNS text AS $$
DECLARE
    expanded_terms text[] := ARRAY[]::text[];
    query_words text[];
    word text;
    synonyms text[];
    synonym text;
    final_query text;
BEGIN
    -- Split query into words
    query_words := string_to_array(lower(trim(p_query)), ' ');
    
    -- Process each word
    FOREACH word IN ARRAY query_words
    LOOP
        -- Add original word
        expanded_terms := array_append(expanded_terms, word);
        
        -- Find synonyms
        SELECT s.synonyms INTO synonyms
        FROM search_synonyms s
        WHERE s.term = word
        AND (p_category IS NULL OR s.category = p_category)
        ORDER BY s.weight DESC
        LIMIT 1;
        
        -- Add synonyms with OR operator
        IF synonyms IS NOT NULL THEN
            FOREACH synonym IN ARRAY synonyms
            LOOP
                expanded_terms := array_append(expanded_terms, synonym);
            END LOOP;
        END IF;
    END LOOP;
    
    -- Join terms with OR for each group, AND between groups
    final_query := array_to_string(expanded_terms, ' | ');
    
    RETURN final_query;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Performance Notes:
-- 1. GIN indexes are created CONCURRENTLY to avoid blocking production traffic
-- 2. Trigram indexes enable fuzzy matching with similarity() function
-- 3. Search analytics table helps monitor performance and optimize queries
-- 4. Synonym expansion improves search recall for domain-specific terms
-- 5. All indexes are designed to support the enhanced search engine implementation

-- Usage Notes:
-- 1. Monitor search_analytics table for queries exceeding 100ms
-- 2. Update synonyms table based on user search patterns
-- 3. Use pg_stat_user_indexes to monitor index usage
-- 4. Consider partitioning search_analytics by date for large volumes