-- ============================================================================
-- Argument Intelligence - Phase 2a Implementation
-- ============================================================================
-- Creates tables to extract, synthesize, and track citizen arguments
-- Enables structured consensus analysis from citizen comments
--
-- Key Features:
--   - Automatic argument extraction from comments
--   - Claim deduplication and tracking
--   - Evidence linking and credibility scoring
--   - Argument relationship mapping
--   - Legislative brief auto-generation
--   - Batch processing for synthesis jobs
--
-- Date: January 15, 2026
-- Status: PRODUCTION-READY
-- ============================================================================

-- ============================================================================
-- 1. ARGUMENTS TABLE - Core structured arguments
-- ============================================================================
CREATE TABLE IF NOT EXISTS arguments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    argument_text TEXT NOT NULL,
    
    -- Position on bill: support, oppose, neutral, conditional
    position VARCHAR(20) NOT NULL DEFAULT 'neutral',
    CONSTRAINT valid_position CHECK (position IN ('support', 'oppose', 'neutral', 'conditional')),
    
    -- Argument strength metrics
    strength_score NUMERIC(3,2) CHECK (strength_score >= 0 AND strength_score <= 1.0),
    support_count INTEGER NOT NULL DEFAULT 0,
    opposition_count INTEGER NOT NULL DEFAULT 1,
    citizen_endorsements INTEGER NOT NULL DEFAULT 0,
    
    -- Source tracking
    source_comments UUID[] DEFAULT ARRAY[]::uuid[],
    source_comment_count INTEGER NOT NULL DEFAULT 1,
    
    -- Extraction quality
    extraction_method VARCHAR(50) NOT NULL DEFAULT 'automated', -- 'automated', 'verified', 'expert'
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Quality assessment
    quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 1.0),
    quality_feedback TEXT,
    
    -- Category/tags
    argument_category VARCHAR(50), -- 'economic', 'social', 'legal', 'environmental', etc.
    argument_tags TEXT[] DEFAULT ARRAY[]::text[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_arguments_bill_position ON arguments(bill_id, position, strength_score DESC);
CREATE INDEX IF NOT EXISTS idx_arguments_verified_quality ON arguments(is_verified, quality_score DESC) 
    WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_arguments_category ON arguments(argument_category);
CREATE INDEX IF NOT EXISTS idx_arguments_endorsements ON arguments(citizen_endorsements DESC);
CREATE INDEX IF NOT EXISTS idx_arguments_created ON arguments(created_at DESC);

-- ============================================================================
-- 2. CLAIMS TABLE - Deduplicated factual assertions
-- ============================================================================
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_text TEXT NOT NULL UNIQUE,
    
    -- Claim categorization
    claim_type VARCHAR(50), -- 'factual', 'predictive', 'normative', 'value'
    subject_area VARCHAR(100), -- What the claim is about
    
    -- Verification status
    verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified', -- 'unverified', 'verified', 'disputed', 'false'
    CONSTRAINT valid_verification CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'false')),
    
    verification_sources INTEGER NOT NULL DEFAULT 0,
    disputed_by_sources INTEGER NOT NULL DEFAULT 0,
    
    -- Metrics
    frequency_in_comments INTEGER NOT NULL DEFAULT 0,
    linked_arguments UUID[] DEFAULT ARRAY[]::uuid[],
    argument_count INTEGER NOT NULL DEFAULT 0,
    
    -- Related data
    linked_evidence_ids UUID[] DEFAULT ARRAY[]::uuid[],
    evidence_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(verification_status);
CREATE INDEX IF NOT EXISTS idx_claims_frequency ON claims(frequency_in_comments DESC);
CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_text_pattern ON claims USING gin(to_tsvector('english', claim_text));

-- ============================================================================
-- 3. EVIDENCE TABLE - Supporting sources and links
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    
    -- Evidence details
    evidence_text TEXT NOT NULL,
    evidence_type VARCHAR(50), -- 'source', 'study', 'report', 'news', 'expert', 'data'
    source_url VARCHAR(500),
    source_title VARCHAR(500),
    source_author VARCHAR(200),
    
    -- Credibility assessment
    credibility_score NUMERIC(3,2) CHECK (credibility_score >= 0 AND credibility_score <= 1.0),
    relevance_score NUMERIC(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1.0),
    overall_strength NUMERIC(3,2) CHECK (overall_strength >= 0 AND overall_strength <= 1.0),
    
    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Usage tracking
    cited_in_arguments UUID[] DEFAULT ARRAY[]::uuid[],
    citation_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accessed_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_claim ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_evidence_credibility ON evidence(credibility_score DESC, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_verified ON evidence(is_verified);

-- ============================================================================
-- 4. ARGUMENT RELATIONSHIPS TABLE - How arguments relate
-- ============================================================================
CREATE TABLE IF NOT EXISTS argument_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    related_argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    
    -- Relationship type
    relationship_type VARCHAR(30) NOT NULL, -- 'supports', 'contradicts', 'clarifies', 'expands'
    CONSTRAINT valid_relationship CHECK (relationship_type IN ('supports', 'contradicts', 'clarifies', 'expands')),
    
    -- Strength of relationship
    relationship_strength NUMERIC(3,2) CHECK (relationship_strength >= 0 AND relationship_strength <= 1.0),
    
    -- Why they're related
    explanation TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arg_rels_source ON argument_relationships(source_argument_id);
CREATE INDEX IF NOT EXISTS idx_arg_rels_related ON argument_relationships(related_argument_id);
CREATE INDEX IF NOT EXISTS idx_arg_rels_type ON argument_relationships(relationship_type);

-- ============================================================================
-- 5. LEGISLATIVE BRIEFS TABLE - Synthesized argument summaries
-- ============================================================================
CREATE TABLE IF NOT EXISTS legislative_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Executive summary
    executive_summary TEXT,
    key_findings TEXT,
    main_consensus VARCHAR(50), -- 'strong_support', 'mixed_support', 'neutral', 'mixed_opposition', 'strong_opposition'
    
    -- Argument counts
    support_argument_count INTEGER NOT NULL DEFAULT 0,
    opposition_argument_count INTEGER NOT NULL DEFAULT 0,
    neutral_argument_count INTEGER NOT NULL DEFAULT 0,
    verified_argument_count INTEGER NOT NULL DEFAULT 0,
    total_citizen_engagement INTEGER NOT NULL DEFAULT 0,
    
    -- Key arguments
    top_support_arguments UUID[] DEFAULT ARRAY[]::uuid[],
    top_opposition_arguments UUID[] DEFAULT ARRAY[]::uuid[],
    
    -- Derived insights
    strongest_argument_for_id UUID REFERENCES arguments(id) ON DELETE SET NULL,
    strongest_argument_against_id UUID REFERENCES arguments(id) ON DELETE SET NULL,
    
    -- Consensus metrics
    consensus_score NUMERIC(3,2) CHECK (consensus_score >= 0 AND consensus_score <= 1.0),
    controversy_level NUMERIC(3,2) CHECK (controversy_level >= 0 AND controversy_level <= 1.0),
    
    -- Generation tracking
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    based_on_comments_count INTEGER NOT NULL DEFAULT 0,
    based_on_arguments_count INTEGER NOT NULL DEFAULT 0,
    
    -- Expert review
    expert_review_requested BOOLEAN DEFAULT false,
    expert_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expert_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brief_bill ON legislative_briefs(bill_id);
CREATE INDEX IF NOT EXISTS idx_brief_consensus ON legislative_briefs(consensus_score DESC);
CREATE INDEX IF NOT EXISTS idx_brief_updated ON legislative_briefs(last_updated_at DESC);

-- ============================================================================
-- 6. SYNTHESIS JOBS TABLE - Track batch processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS synthesis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Job tracking
    job_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'failed'
    CONSTRAINT valid_job_status CHECK (job_status IN ('pending', 'processing', 'complete', 'failed')),
    
    job_type VARCHAR(50), -- 'initial_synthesis', 'update_synthesis', 'full_reprocess'
    
    -- Processing details
    comments_processed INTEGER NOT NULL DEFAULT 0,
    arguments_extracted INTEGER NOT NULL DEFAULT 0,
    claims_identified INTEGER NOT NULL DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_bill ON synthesis_jobs(bill_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON synthesis_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON synthesis_jobs(scheduled_for) 
    WHERE job_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON synthesis_jobs(priority) 
    WHERE job_status = 'pending';

-- ============================================================================
-- TRIGGERS - Automatic updates
-- ============================================================================

-- Trigger: Update legislative brief when arguments change
CREATE OR REPLACE FUNCTION update_brief_on_argument_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE legislative_briefs
    SET 
        support_argument_count = (
            SELECT COUNT(*) FROM arguments 
            WHERE bill_id = NEW.bill_id AND position = 'support' AND is_verified = true
        ),
        opposition_argument_count = (
            SELECT COUNT(*) FROM arguments 
            WHERE bill_id = NEW.bill_id AND position = 'oppose' AND is_verified = true
        ),
        verified_argument_count = (
            SELECT COUNT(*) FROM arguments 
            WHERE bill_id = NEW.bill_id AND is_verified = true
        ),
        last_updated_at = CURRENT_TIMESTAMP
    WHERE bill_id = NEW.bill_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_brief_on_argument_change
    AFTER INSERT OR UPDATE OR DELETE ON arguments
    FOR EACH ROW
    EXECUTE FUNCTION update_brief_on_argument_change();

-- Trigger: Update claim frequency when referenced
CREATE OR REPLACE FUNCTION update_claim_frequency()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE claims
    SET 
        frequency_in_comments = (
            SELECT COUNT(*) FROM arguments 
            WHERE id = ANY(linked_arguments)
        )
    WHERE id = NEW.claim_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_claim_frequency
    AFTER INSERT OR UPDATE ON evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_claim_frequency();

-- ============================================================================
-- VIEWS - Easy access patterns
-- ============================================================================

-- Bill Arguments Summary
CREATE OR REPLACE VIEW bill_arguments_summary AS
SELECT 
    b.id as bill_id,
    b.title,
    COUNT(CASE WHEN a.position = 'support' THEN 1 END) as support_count,
    COUNT(CASE WHEN a.position = 'oppose' THEN 1 END) as oppose_count,
    COUNT(CASE WHEN a.position = 'neutral' THEN 1 END) as neutral_count,
    COUNT(CASE WHEN a.is_verified = true THEN 1 END) as verified_count,
    COALESCE(AVG(a.confidence_score), 0) as avg_confidence,
    COALESCE(AVG(a.strength_score), 0) as avg_strength,
    COUNT(DISTINCT UNNEST(a.source_comments)) as total_source_comments
FROM bills b
LEFT JOIN arguments a ON b.id = a.bill_id
GROUP BY b.id, b.title;

-- Top Arguments by Support
CREATE OR REPLACE VIEW top_arguments_by_support AS
SELECT 
    id,
    bill_id,
    argument_text,
    position,
    support_count + citizen_endorsements as total_support,
    confidence_score,
    strength_score,
    created_at
FROM arguments
WHERE is_verified = true
ORDER BY (support_count + citizen_endorsements) DESC
LIMIT 100;

-- Consensus View
CREATE OR REPLACE VIEW bill_consensus_analysis AS
SELECT 
    b.id as bill_id,
    b.title,
    CASE 
        WHEN COUNT(CASE WHEN a.position = 'support' THEN 1 END) > COUNT(CASE WHEN a.position = 'oppose' THEN 1 END) * 2
        THEN 'strong_support'
        WHEN COUNT(CASE WHEN a.position = 'support' THEN 1 END) > COUNT(CASE WHEN a.position = 'oppose' THEN 1 END)
        THEN 'mixed_support'
        WHEN COUNT(CASE WHEN a.position = 'support' THEN 1 END) = COUNT(CASE WHEN a.position = 'oppose' THEN 1 END)
        THEN 'neutral'
        WHEN COUNT(CASE WHEN a.position = 'oppose' THEN 1 END) > COUNT(CASE WHEN a.position = 'support' THEN 1 END)
        THEN 'mixed_opposition'
        ELSE 'strong_opposition'
    END as consensus,
    COUNT(a.id) as total_arguments,
    ROUND(
        COUNT(CASE WHEN a.position = 'support' THEN 1 END)::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as support_percentage
FROM bills b
LEFT JOIN arguments a ON b.id = a.bill_id AND a.is_verified = true
GROUP BY b.id, b.title;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT 
    'arguments' as table_name, COUNT(*) as row_count 
FROM arguments
UNION ALL
SELECT 'claims', COUNT(*) FROM claims
UNION ALL
SELECT 'evidence', COUNT(*) FROM evidence
UNION ALL
SELECT 'argument_relationships', COUNT(*) FROM argument_relationships
UNION ALL
SELECT 'legislative_briefs', COUNT(*) FROM legislative_briefs
UNION ALL
SELECT 'synthesis_jobs', COUNT(*) FROM synthesis_jobs;
