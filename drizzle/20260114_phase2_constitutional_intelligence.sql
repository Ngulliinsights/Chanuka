-- ============================================================================
-- MIGRATION: Phase 2 Features - Constitutional & Legal Intelligence
-- Description: Create constitutional analysis, legal precedents, and risk assessment
-- Date: 2026-01-14
-- ============================================================================

-- ============================================================================
-- CONSTITUTIONAL FRAMEWORK TABLES
-- ============================================================================

-- Constitutional Provisions: Constitution sections and their meaning
CREATE TABLE IF NOT EXISTS constitutional_provisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provision_number varchar(50) NOT NULL, -- "Article 1", "Section 33", etc.
    provision_title varchar(255) NOT NULL,
    provision_text text NOT NULL,
    
    -- Classification
    chapter varchar(100), -- "Sovereignty of the People", "Citizenship", "Rights and Freedoms"
    article_number integer,
    
    -- Content summary
    summary text,
    key_principles text[] DEFAULT ARRAY[]::text[],
    
    -- Rights and duties defined
    rights_granted text[] DEFAULT ARRAY[]::text[],
    duties_imposed text[] DEFAULT ARRAY[]::text[],
    limitations text[] DEFAULT ARRAY[]::text[],
    
    -- Related provisions
    cross_references varchar(100)[] DEFAULT ARRAY[]::varchar[], -- Links to other articles
    
    -- Judicial interpretation
    leading_cases uuid[] DEFAULT ARRAY[]::uuid[], -- References to landmark cases
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_constitutional_provisions_number ON constitutional_provisions(provision_number);
CREATE INDEX idx_constitutional_provisions_chapter ON constitutional_provisions(chapter);
CREATE UNIQUE INDEX idx_constitutional_provisions_unique ON constitutional_provisions(provision_number);

-- Legal Precedents: Court rulings and landmark cases
CREATE TABLE IF NOT EXISTS legal_precedents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_name varchar(500) NOT NULL UNIQUE,
    case_citation varchar(100), -- e.g., "2019 eKLR"
    court_level varchar(50) NOT NULL, -- "supreme", "appeal", "high", "magistrate"
    decision_date date NOT NULL,
    
    -- Case details
    judge_name varchar(255),
    holding text NOT NULL, -- Main legal principle established
    ratio_decidendi text, -- Reasoning of the court
    
    -- Issues addressed
    legal_issues text[] DEFAULT ARRAY[]::text[],
    affected_legislation text[] DEFAULT ARRAY[]::text[],
    
    -- Impact
    precedential_value varchar(50), -- "binding", "persuasive", "overruled", "limited"
    current_status varchar(50) DEFAULT 'active', -- "active", "overruled", "vacated", "limited"
    
    -- Full text and links
    full_text_url varchar(500),
    decision_summary text,
    
    -- Tags for easy searching
    keywords text[] DEFAULT ARRAY[]::text[],
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_precedents_court_date ON legal_precedents(court_level, decision_date DESC);
CREATE INDEX idx_legal_precedents_issues ON legal_precedents USING gin(legal_issues);
CREATE INDEX idx_legal_precedents_status ON legal_precedents(current_status);

-- Constitutional Analyses: Analysis of bill against constitution
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Overall assessment
    analysis_status varchar(20) NOT NULL DEFAULT 'pending', -- "pending", "completed", "needs_review"
    constitutional_alignment_score numeric(5,2) NOT NULL DEFAULT 0, -- 0.00 to 100.00
    overall_finding varchar(50) NOT NULL DEFAULT 'no_concerns', -- "no_concerns", "minor_concerns", "significant_concerns", "potential_unconstitutionality"
    
    -- Key findings
    executive_summary text NOT NULL,
    alignment_with_provisions uuid[] DEFAULT ARRAY[]::uuid[], -- References to constitutional provisions
    conflicts_with_provisions uuid[] DEFAULT ARRAY[]::uuid[],
    
    -- Specific concerns
    rights_impact text, -- Which rights does it affect?
    fundamental_freedoms_impact varchar(500),
    minority_protections_impact varchar(500),
    
    -- Legal risks
    identified_risks text[] DEFAULT ARRAY[]::text[],
    highest_risk_area varchar(500),
    likelihood_of_challenge varchar(50), -- "low", "medium", "high", "very_high"
    
    -- Expert review
    analyzed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    expert_notes text,
    peer_review_completed boolean NOT NULL DEFAULT false,
    peer_reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    
    -- Recommendations
    recommended_amendments text,
    implementation_concerns text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_constitutional_analyses_bill ON constitutional_analyses(bill_id);
CREATE INDEX idx_constitutional_analyses_status ON constitutional_analyses(analysis_status);
CREATE INDEX idx_constitutional_analyses_alignment ON constitutional_analyses(constitutional_alignment_score);

-- Constitutional Conflicts: Specific provisions in conflict
CREATE TABLE IF NOT EXISTS constitutional_conflicts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    constitutional_provision_id uuid NOT NULL REFERENCES constitutional_provisions(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type varchar(50) NOT NULL, -- "direct_conflict", "restriction", "violation", "imbalance"
    conflict_description text NOT NULL,
    
    -- Severity
    severity_level varchar(20) NOT NULL, -- "low", "medium", "high", "critical"
    conflict_certainty numeric(5,2) NOT NULL, -- 0.00 to 100.00 confidence
    
    -- How to resolve
    resolution_options text[] DEFAULT ARRAY[]::text[],
    precedent_guidance uuid REFERENCES legal_precedents(id) ON DELETE SET NULL,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_constitutional_conflicts_bill ON constitutional_conflicts(bill_id);
CREATE INDEX idx_constitutional_conflicts_provision ON constitutional_conflicts(constitutional_provision_id);
CREATE INDEX idx_constitutional_conflicts_severity ON constitutional_conflicts(severity_level);

-- Implementation Workarounds: Solutions to constitutional concerns
CREATE TABLE IF NOT EXISTS implementation_workarounds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    constitutional_conflict_id uuid REFERENCES constitutional_conflicts(id) ON DELETE SET NULL,
    
    -- Workaround details
    workaround_title varchar(255) NOT NULL,
    workaround_description text NOT NULL,
    workaround_type varchar(50), -- "amendment", "implementation_guidance", "court_interpretation"
    
    -- Effectiveness
    similarity_score numeric(5,2) NOT NULL, -- How similar is this to original bill? 0.00 to 100.00
    effectiveness_score numeric(5,2), -- How well does it solve the problem? 0.00 to 100.00
    detection_confidence numeric(3,2),
    
    -- Status
    status varchar(20) NOT NULL DEFAULT 'proposed', -- "proposed", "active", "rejected", "superseded"
    is_implemented boolean NOT NULL DEFAULT false,
    
    -- Source
    suggested_by uuid REFERENCES users(id) ON DELETE SET NULL,
    related_precedent_ids uuid[] DEFAULT ARRAY[]::uuid[],
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_implementation_workarounds_bill ON implementation_workarounds(original_bill_id);
CREATE INDEX idx_implementation_workarounds_status ON implementation_workarounds(status);

-- Hidden Provisions: Unintended consequences or provisions not obviously stated
CREATE TABLE IF NOT EXISTS hidden_provisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Hidden provision details
    provision_title varchar(255) NOT NULL,
    provision_description text NOT NULL,
    provision_type varchar(50), -- "implicit_requirement", "unintended_consequence", "loophole", "undefined_term"
    
    -- How it was identified
    identification_method varchar(100),
    identified_by uuid REFERENCES users(id) ON DELETE SET NULL,
    
    -- Impact assessment
    impact_description text,
    affected_groups text[] DEFAULT ARRAY[]::text[],
    potential_abuse_scenario text,
    
    -- Severity
    concern_level varchar(20) NOT NULL DEFAULT 'medium', -- "low", "medium", "high", "critical"
    likelihood_of_occurrence numeric(3,2), -- 0.00 to 1.00
    
    -- Proposed fixes
    recommended_clarifications text,
    amendment_proposals text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_hidden_provisions_bill ON hidden_provisions(bill_id);
CREATE INDEX idx_hidden_provisions_concern_level ON hidden_provisions(concern_level);

-- Legal Risks: Overall legal risk assessment
CREATE TABLE IF NOT EXISTS legal_risks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Risk assessment
    risk_type varchar(100) NOT NULL, -- "procedural", "substantive", "implementation", "enforcement", "interpretation"
    risk_description text NOT NULL,
    
    -- Probability and impact
    probability varchar(20) NOT NULL, -- "remote", "unlikely", "possible", "likely", "very_likely"
    impact_level varchar(20) NOT NULL, -- "minor", "moderate", "significant", "severe", "catastrophic"
    overall_risk_score numeric(5,2) NOT NULL, -- 0.00 to 100.00
    
    -- Mitigation
    mitigation_strategies text[] DEFAULT ARRAY[]::text[],
    can_be_mitigated_in_bill boolean NOT NULL DEFAULT true,
    
    -- Evidence
    supporting_precedents uuid[] DEFAULT ARRAY[]::uuid[],
    similar_failed_bills text[] DEFAULT ARRAY[]::text[],
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_risks_bill ON legal_risks(bill_id);
CREATE INDEX idx_legal_risks_score ON legal_risks(overall_risk_score DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC SCORING
-- ============================================================================

-- Trigger: Calculate constitutional alignment score
CREATE OR REPLACE FUNCTION calculate_constitutional_alignment()
RETURNS TRIGGER AS $$
DECLARE
    total_concerns integer;
    critical_count integer;
    high_count integer;
    alignment_score numeric;
BEGIN
    -- Count conflicts by severity
    SELECT COUNT(*), 
           COALESCE(SUM(CASE WHEN severity_level = 'critical' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN severity_level = 'high' THEN 1 ELSE 0 END), 0)
    INTO total_concerns, critical_count, high_count
    FROM constitutional_conflicts
    WHERE bill_id = NEW.bill_id;
    
    -- Calculate alignment score (100 - penalty)
    alignment_score := GREATEST(0, 100 - (critical_count * 20 + high_count * 10));
    
    UPDATE constitutional_analyses SET
        constitutional_alignment_score = alignment_score,
        overall_finding = CASE 
            WHEN alignment_score >= 90 THEN 'no_concerns'
            WHEN alignment_score >= 70 THEN 'minor_concerns'
            WHEN alignment_score >= 50 THEN 'significant_concerns'
            ELSE 'potential_unconstitutionality'
        END,
        updated_at = NOW()
    WHERE bill_id = NEW.bill_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_alignment
    AFTER INSERT OR UPDATE OR DELETE ON constitutional_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_constitutional_alignment();

-- ============================================================================
-- PERMISSIONS AND GRANTS
-- ============================================================================

GRANT SELECT ON constitutional_provisions TO "public";
GRANT SELECT ON legal_precedents TO "public";
GRANT SELECT, INSERT, UPDATE ON constitutional_analyses TO "public";
GRANT SELECT ON constitutional_conflicts TO "public";
GRANT SELECT ON implementation_workarounds TO "public";
GRANT SELECT ON hidden_provisions TO "public";
GRANT SELECT ON legal_risks TO "public";

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

INSERT INTO __drizzle_migrations__ (hash, created_at)
VALUES (
    'phase2_constitutional_intelligence_20260114',
    now()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

/*
-- Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'constitutional_provisions', 'legal_precedents', 'constitutional_analyses',
    'constitutional_conflicts', 'implementation_workarounds', 'hidden_provisions',
    'legal_risks'
)
ORDER BY table_name;

-- Count tables
SELECT COUNT(*) as tables_created FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'constitutional_provisions', 'legal_precedents', 'constitutional_analyses',
    'constitutional_conflicts', 'implementation_workarounds', 'hidden_provisions',
    'legal_risks'
);
*/
