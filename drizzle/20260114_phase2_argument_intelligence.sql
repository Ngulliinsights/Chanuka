-- ============================================================================
-- MIGRATION: Phase 2 Features - Argument Intelligence
-- Description: Create argument extraction, synthesis, and evidence tracking
-- Date: 2026-01-14
-- ============================================================================

-- ============================================================================
-- ARGUMENT INTELLIGENCE TABLES
-- ============================================================================

-- Arguments: Structured claims extracted from comments
CREATE TABLE IF NOT EXISTS arguments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Argument content
    argument_text text NOT NULL,
    argument_summary varchar(500),
    position varchar(20) NOT NULL, -- "support", "oppose", "neutral", "conditional"
    
    -- Classification
    argument_type varchar(50), -- "economic", "constitutional", "social", "procedural"
    strength_score numeric(3,2), -- 0.00 to 1.00
    
    -- Source tracking
    source_comments uuid[] DEFAULT ARRAY[]::uuid[],
    extraction_method varchar(20) NOT NULL DEFAULT 'automated', -- "automated", "manual", "hybrid"
    confidence_score numeric(3,2),
    
    -- Engagement metrics
    support_count integer NOT NULL DEFAULT 0,
    opposition_count integer NOT NULL DEFAULT 0,
    citizen_endorsements integer NOT NULL DEFAULT 0,
    
    -- Quality and moderation
    is_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
    quality_score numeric(3,2),
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

-- Create indexes for arguments
CREATE INDEX idx_arguments_bill_position ON arguments(bill_id, position, strength_score DESC);
CREATE INDEX idx_arguments_verified_quality ON arguments(is_verified, quality_score DESC) WHERE is_verified = true;
CREATE INDEX idx_arguments_source_comments ON arguments USING gin(source_comments);
CREATE INDEX idx_arguments_created ON arguments(created_at DESC);

-- Claims: Factual assertions found in arguments
CREATE TABLE IF NOT EXISTS claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Claim content
    claim_text text NOT NULL,
    claim_summary varchar(300),
    claim_type varchar(50), -- "factual", "predictive", "normative", "causal"
    
    -- Verification status
    verification_status varchar(20) NOT NULL DEFAULT 'unverified',
    fact_check_url varchar(500),
    
    -- Supporting information
    supporting_arguments uuid[] DEFAULT ARRAY[]::uuid[],
    contradicting_arguments uuid[] DEFAULT ARRAY[]::uuid[],
    
    -- Frequency and impact
    mention_count integer NOT NULL DEFAULT 1,
    bills_referenced uuid[] DEFAULT ARRAY[]::uuid[],
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_verification_status ON claims(verification_status, mention_count DESC);
CREATE INDEX idx_claims_bills_referenced ON claims USING gin(bills_referenced);

-- Evidence: Supporting sources and links
CREATE TABLE IF NOT EXISTS evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    argument_id uuid NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
    
    -- Evidence content
    evidence_type varchar(50) NOT NULL, -- "source", "study", "precedent", "expert_opinion"
    evidence_title varchar(500),
    evidence_text text,
    evidence_url varchar(500),
    
    -- Source tracking
    source_type varchar(50), -- "government", "academic", "news", "expert"
    source_name varchar(255),
    publication_date date,
    
    -- Quality metrics
    credibility_score numeric(3,2), -- 0.00 to 1.00
    relevance_score numeric(3,2),
    verification_status varchar(20) DEFAULT 'unverified',
    
    -- Engagement
    citation_count integer NOT NULL DEFAULT 0,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_argument_claim ON evidence(argument_id, claim_id);
CREATE INDEX idx_evidence_credibility_relevance ON evidence(credibility_score DESC, relevance_score DESC);
CREATE INDEX idx_evidence_source_type ON evidence(source_type, verification_status);

-- Argument Relationships: How arguments connect/relate
CREATE TABLE IF NOT EXISTS argument_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_argument_id uuid NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    target_argument_id uuid NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    
    -- Relationship type
    relationship_type varchar(50) NOT NULL, -- "supports", "contradicts", "elaborates", "weakens"
    strength_score numeric(3,2), -- 0.00 to 1.00
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT no_self_relationship CHECK (source_argument_id != target_argument_id)
);

CREATE INDEX idx_argument_relationships_source ON argument_relationships(source_argument_id);
CREATE INDEX idx_argument_relationships_target ON argument_relationships(target_argument_id);

-- Synthesis Jobs: Batch processing for argument extraction
CREATE TABLE IF NOT EXISTS synthesis_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Job status
    job_status varchar(20) NOT NULL DEFAULT 'pending', -- "pending", "processing", "completed", "failed"
    job_type varchar(50) NOT NULL, -- "extract_arguments", "link_evidence", "verify_claims"
    
    -- Processing details
    total_items integer NOT NULL DEFAULT 0,
    processed_items integer NOT NULL DEFAULT 0,
    failed_items integer NOT NULL DEFAULT 0,
    
    -- Results
    arguments_extracted integer NOT NULL DEFAULT 0,
    claims_found integer NOT NULL DEFAULT 0,
    evidence_linked integer NOT NULL DEFAULT 0,
    
    -- Error handling
    error_message text,
    
    -- Timing
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_job_status CHECK (job_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_synthesis_jobs_bill_status ON synthesis_jobs(bill_id, job_status);
CREATE INDEX idx_synthesis_jobs_created ON synthesis_jobs(created_at DESC) WHERE job_status = 'pending';

-- Legislative Brief: Summary of citizen arguments for a bill
CREATE TABLE IF NOT EXISTS legislative_briefs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Brief content
    brief_summary text,
    key_arguments_summary text,
    main_concerns text,
    recommended_amendments text,
    
    -- Metrics
    total_arguments_count integer NOT NULL DEFAULT 0,
    support_arguments_count integer NOT NULL DEFAULT 0,
    oppose_arguments_count integer NOT NULL DEFAULT 0,
    neutral_arguments_count integer NOT NULL DEFAULT 0,
    
    -- Citizen engagement
    citizen_engagement_score numeric(3,2), -- 0.00 to 1.00
    consensus_level numeric(3,2), -- How much agreement among citizens
    
    -- Expert review
    expert_reviewed boolean NOT NULL DEFAULT false,
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    expert_notes text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_legislative_briefs_bill_id ON legislative_briefs(bill_id);
CREATE INDEX idx_legislative_briefs_updated ON legislative_briefs(updated_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger: Update argument count in legislative brief
CREATE OR REPLACE FUNCTION update_brief_argument_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE legislative_briefs SET
        total_arguments_count = (
            SELECT COUNT(*) FROM arguments WHERE bill_id = NEW.bill_id
        ),
        support_arguments_count = (
            SELECT COUNT(*) FROM arguments WHERE bill_id = NEW.bill_id AND position = 'support'
        ),
        oppose_arguments_count = (
            SELECT COUNT(*) FROM arguments WHERE bill_id = NEW.bill_id AND position = 'oppose'
        ),
        neutral_arguments_count = (
            SELECT COUNT(*) FROM arguments WHERE bill_id = NEW.bill_id AND position = 'neutral'
        ),
        updated_at = NOW()
    WHERE bill_id = NEW.bill_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_brief_counts
    AFTER INSERT OR UPDATE OR DELETE ON arguments
    FOR EACH ROW
    EXECUTE FUNCTION update_brief_argument_counts();

-- Trigger: Ensure legislative brief exists when bill is created
CREATE OR REPLACE FUNCTION ensure_legislative_brief_exists()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO legislative_briefs (bill_id) VALUES (NEW.id)
    ON CONFLICT (bill_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_brief
    AFTER INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION ensure_legislative_brief_exists();

-- ============================================================================
-- PERMISSIONS AND GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON arguments TO "public";
GRANT SELECT, INSERT, UPDATE ON claims TO "public";
GRANT SELECT, INSERT, UPDATE ON evidence TO "public";
GRANT SELECT ON argument_relationships TO "public";
GRANT SELECT, INSERT, UPDATE ON synthesis_jobs TO "public";
GRANT SELECT, INSERT, UPDATE ON legislative_briefs TO "public";

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Record this migration in migration history if you have one
INSERT INTO __drizzle_migrations__ (hash, created_at)
VALUES (
    'phase2_argument_intelligence_20260114',
    now()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

/*
-- Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('arguments', 'claims', 'evidence', 'argument_relationships', 'synthesis_jobs', 'legislative_briefs')
ORDER BY table_name;

-- Verify indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('arguments', 'claims', 'evidence', 'argument_relationships', 'synthesis_jobs', 'legislative_briefs')
ORDER BY tablename, indexname;

-- Verify triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table IN ('arguments', 'bills')
ORDER BY trigger_name;
*/
