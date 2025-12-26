-- Database Performance Optimizations Migration
-- Timestamp: 20251223154627
-- Description: Comprehensive database performance improvements including type alignment,
-- vertical partitioning, full-text search optimization, numeric precision updates, and performance enhancements

-- ============================================================================
-- 1. TYPE ALIGNMENT: Integer to UUID conversion for analysis table
-- ============================================================================

-- Ensure analysis table uses UUID (already implemented in schema, but adding migration for consistency)
-- ALTER TABLE analysis ALTER COLUMN id TYPE uuid USING gen_random_uuid();
-- ALTER TABLE analysis ALTER COLUMN bill_id TYPE uuid;
-- ALTER TABLE analysis ALTER COLUMN approved_by TYPE uuid;

-- ============================================================================
-- 2. VERTICAL PARTITIONING: Create audit_payloads table and move heavy JSONB columns
-- ============================================================================

-- Create audit_payloads table for vertical partitioning of heavy JSONB data
CREATE TABLE IF NOT EXISTS audit_payloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id uuid NOT NULL REFERENCES system_audit_log(id) ON DELETE CASCADE,
    payload_type varchar(50) NOT NULL CHECK (payload_type IN ('action_details', 'resource_usage')),
    payload_data jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(audit_log_id, payload_type)
);

-- Create indexes for audit_payloads
CREATE INDEX idx_audit_payloads_audit_log_id ON audit_payloads(audit_log_id);
CREATE INDEX idx_audit_payloads_type ON audit_payloads(payload_type);
CREATE INDEX idx_audit_payloads_created_at ON audit_payloads(created_at);

-- GIN index for payload_data searches
CREATE INDEX idx_audit_payloads_payload_gin ON audit_payloads USING gin(payload_data);

-- Migrate existing data from system_audit_log to audit_payloads
INSERT INTO audit_payloads (audit_log_id, payload_type, payload_data, created_at)
SELECT
    id as audit_log_id,
    'action_details' as payload_type,
    action_details as payload_data,
    created_at
FROM system_audit_log
WHERE action_details IS NOT NULL AND action_details != '{}'::jsonb;

INSERT INTO audit_payloads (audit_log_id, payload_type, payload_data, created_at)
SELECT
    id as audit_log_id,
    'resource_usage' as payload_type,
    resource_usage as payload_data,
    created_at
FROM system_audit_log
WHERE resource_usage IS NOT NULL AND resource_usage != '{}'::jsonb;

-- Remove the heavy JSONB columns from system_audit_log
ALTER TABLE system_audit_log DROP COLUMN IF EXISTS action_details;
ALTER TABLE system_audit_log DROP COLUMN IF EXISTS resource_usage;

-- ============================================================================
-- 3. FULL-TEXT SEARCH: Add GIN indexes and tsvector columns for search optimization
-- ============================================================================

-- Add tsvector columns and GIN indexes for content_embeddings
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS content_title_tsv tsvector;
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS content_summary_tsv tsvector;
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS content_tags_tsv tsvector;

-- Create GIN indexes for tsvector columns
CREATE INDEX IF NOT EXISTS idx_content_embeddings_title_tsv_gin ON content_embeddings USING gin(content_title_tsv);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_summary_tsv_gin ON content_embeddings USING gin(content_summary_tsv);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_tags_tsv_gin ON content_embeddings USING gin(content_tags_tsv);

-- Populate tsvector columns with existing data
UPDATE content_embeddings SET
    content_title_tsv = to_tsvector('english', COALESCE(content_title, '')),
    content_summary_tsv = to_tsvector('english', COALESCE(content_summary, '')),
    content_tags_tsv = to_tsvector('english', array_to_string(content_tags, ' '))
WHERE content_title_tsv IS NULL OR content_summary_tsv IS NULL OR content_tags_tsv IS NULL;

-- Add tsvector column for search_queries
ALTER TABLE search_queries ADD COLUMN IF NOT EXISTS query_text_tsv tsvector;

-- Create GIN index for search queries
CREATE INDEX IF NOT EXISTS idx_search_queries_text_tsv_gin ON search_queries USING gin(query_text_tsv);

-- Populate tsvector column
UPDATE search_queries SET
    query_text_tsv = to_tsvector('english', query_text)
WHERE query_text_tsv IS NULL;

-- ============================================================================
-- 4. NUMERIC PRECISION: Update financial columns to proper decimal types
-- ============================================================================

-- Ensure financial columns in transparency_intelligence use proper decimal precision
-- (Already implemented in schema, but adding explicit ALTER statements for consistency)

-- Update financial_interests table decimal columns
ALTER TABLE financial_interests ALTER COLUMN estimated_value_min TYPE decimal(15,2);
ALTER TABLE financial_interests ALTER COLUMN estimated_value_max TYPE decimal(15,2);
ALTER TABLE financial_interests ALTER COLUMN ownership_percentage TYPE decimal(5,2);

-- Update conflict_detections table
ALTER TABLE conflict_detections ALTER COLUMN confidence_score TYPE decimal(5,2);

-- Update influence_networks table
ALTER TABLE influence_networks ALTER COLUMN relationship_strength TYPE decimal(5,2);
ALTER TABLE influence_networks ALTER COLUMN influence_score TYPE decimal(5,2);

-- Update implementation_workarounds table
ALTER TABLE implementation_workarounds ALTER COLUMN similarity_score TYPE decimal(5,2);
ALTER TABLE implementation_workarounds ALTER COLUMN detection_confidence TYPE decimal(3,2);

-- ============================================================================
-- 5. PERFORMANCE OPTIMIZATIONS: Set tables to UNLOGGED and add partial indexes
-- ============================================================================

-- Set high-volume search tables to UNLOGGED for better performance
-- Note: UNLOGGED tables are not crash-safe but provide significant performance improvements

ALTER TABLE search_queries SET UNLOGGED;
ALTER TABLE content_embeddings SET UNLOGGED;
ALTER TABLE search_analytics SET UNLOGGED;

-- Add additional partial indexes for performance optimization

-- Partial index for active content embeddings only
CREATE INDEX IF NOT EXISTS idx_content_embeddings_active ON content_embeddings(content_type, updated_at DESC)
WHERE processing_status = 'completed';

-- Partial index for failed embeddings (for retry logic)
CREATE INDEX IF NOT EXISTS idx_content_embeddings_failed ON content_embeddings(last_attempt_at DESC)
WHERE processing_status = 'failed' AND processing_attempts < 3;

-- Partial index for recent search queries (last 30 days)
CREATE INDEX IF NOT EXISTS idx_search_queries_recent ON search_queries(created_at DESC, user_id)
WHERE created_at > now() - interval '30 days';

-- Partial index for search queries with results
CREATE INDEX IF NOT EXISTS idx_search_queries_with_results ON search_queries(total_results DESC, created_at DESC)
WHERE total_results > 0;

-- Partial index for high-confidence conflict detections
CREATE INDEX IF NOT EXISTS idx_conflict_detections_high_confidence ON conflict_detections(bill_id, confidence_score DESC)
WHERE confidence_score >= 0.8;

-- Partial index for active influence networks
CREATE INDEX IF NOT EXISTS idx_influence_networks_active_strong ON influence_networks(source_entity_type, relationship_strength DESC)
WHERE is_active = true AND relationship_strength >= 70;

-- Partial index for high-risk implementation workarounds
CREATE INDEX IF NOT EXISTS idx_workarounds_high_risk_active ON implementation_workarounds(original_bill_id, similarity_score DESC)
WHERE status = 'active' AND similarity_score >= 70;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TSVECTOR UPDATES
-- ============================================================================

-- Function to update tsvector columns
CREATE OR REPLACE FUNCTION update_content_embeddings_tsv()
RETURNS trigger AS $$
BEGIN
    NEW.content_title_tsv := to_tsvector('english', COALESCE(NEW.content_title, ''));
    NEW.content_summary_tsv := to_tsvector('english', COALESCE(NEW.content_summary, ''));
    NEW.content_tags_tsv := to_tsvector('english', array_to_string(NEW.content_tags, ' '));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content_embeddings
CREATE TRIGGER trg_content_embeddings_tsv_update
    BEFORE INSERT OR UPDATE ON content_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_content_embeddings_tsv();

-- Function for search_queries
CREATE OR REPLACE FUNCTION update_search_queries_tsv()
RETURNS trigger AS $$
BEGIN
    NEW.query_text_tsv := to_tsvector('english', NEW.query_text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search_queries
CREATE TRIGGER trg_search_queries_tsv_update
    BEFORE INSERT OR UPDATE ON search_queries
    FOR EACH ROW EXECUTE FUNCTION update_search_queries_tsv();

-- ============================================================================
-- FINAL OPTIMIZATION: CLUSTER TABLES ON COMMON ACCESS PATTERNS
-- ============================================================================

-- Cluster content_embeddings on content_type for better locality
CLUSTER content_embeddings USING idx_content_embeddings_content_type_id;

-- Cluster search_queries on created_at for time-based queries
CLUSTER search_queries USING idx_search_queries_user_created;

-- Cluster system_audit_log on created_at for audit queries
CLUSTER system_audit_log USING idx_system_audit_log_category_created;