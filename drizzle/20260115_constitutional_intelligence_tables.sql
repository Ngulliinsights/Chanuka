-- ============================================================================
-- Constitutional Intelligence - Phase 2c Implementation
-- ============================================================================
-- Creates tables for constitutional compliance analysis and legal risk assessment
-- Enables bills to be analyzed for constitutional validity before voting
--
-- Key Features:
--   - Constitutional alignment scoring (0-100%)
--   - Conflict identification and tracking
--   - Legal precedent mapping
--   - Legal risk assessment framework
--   - Implementation workaround suggestions
--   - Hidden provision detection
--
-- Date: January 15, 2026
-- Status: PRODUCTION-READY
-- ============================================================================

-- ============================================================================
-- 1. CONSTITUTIONAL PROVISIONS TABLE - Constitution sections
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitutional_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provision_code VARCHAR(50) UNIQUE NOT NULL, -- "Article 33", "Article 10(2)", etc.
    provision_title VARCHAR(255) NOT NULL,
    
    -- Content
    full_text TEXT NOT NULL,
    interpretation TEXT, -- How courts typically interpret this
    
    -- Categorization
    topic_area VARCHAR(100), -- 'rights', 'freedoms', 'governance', 'property', 'economic'
    significance_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    
    -- Relationships
    related_provisions VARCHAR(50)[] DEFAULT ARRAY[]::varchar[], -- References to other articles
    related_laws TEXT[] DEFAULT ARRAY[]::text[], -- Related legislation
    
    -- Historical context
    amendment_history TEXT,
    court_interpretations TEXT,
    
    -- Metrics
    bills_analyzed_against INTEGER NOT NULL DEFAULT 0,
    conflicts_detected INTEGER NOT NULL DEFAULT 0,
    precedent_cases_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provisions_code ON constitutional_provisions(provision_code);
CREATE INDEX IF NOT EXISTS idx_provisions_topic ON constitutional_provisions(topic_area);
CREATE INDEX IF NOT EXISTS idx_provisions_significance ON constitutional_provisions(significance_level);
CREATE INDEX IF NOT EXISTS idx_provisions_text ON constitutional_provisions USING gin(to_tsvector('english', full_text));

-- ============================================================================
-- 2. LEGAL PRECEDENTS TABLE - Court rulings and case law
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_precedents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_name VARCHAR(500) NOT NULL,
    case_citation VARCHAR(100) NOT NULL UNIQUE, -- e.g., "2019 eKLR 123"
    
    -- Case details
    court_name VARCHAR(200) NOT NULL,
    decision_date DATE NOT NULL,
    judge_name VARCHAR(200),
    ruling_summary TEXT NOT NULL,
    full_text_url VARCHAR(500),
    
    -- Precedent details
    precedent_type VARCHAR(50), -- 'landmark', 'applicable', 'cautionary', 'overturned'
    precedent_strength NUMERIC(3,2) CHECK (precedent_strength >= 0 AND precedent_strength <= 1.0),
    
    -- Constitutional provisions addressed
    provisions_addressed UUID[] DEFAULT ARRAY[]::uuid[],
    provision_count INTEGER NOT NULL DEFAULT 0,
    
    -- Related bills that could be affected
    related_bills_potential UUID[] DEFAULT ARRAY[]::uuid[],
    bills_comparing_count INTEGER NOT NULL DEFAULT 0,
    
    -- Key holdings (what the court ruled)
    key_holdings TEXT[] DEFAULT ARRAY[]::text[],
    
    -- Impact assessment
    still_valid BOOLEAN NOT NULL DEFAULT true,
    overturned_by_case_id UUID REFERENCES legal_precedents(id) ON DELETE SET NULL,
    impact_areas VARCHAR(100)[] DEFAULT ARRAY[]::varchar[], -- 'legislation', 'policy', 'individual_rights', etc.
    
    -- Verification
    verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_precedent_case_name ON legal_precedents(case_name);
CREATE INDEX IF NOT EXISTS idx_precedent_date ON legal_precedents(decision_date DESC);
CREATE INDEX IF NOT EXISTS idx_precedent_strength ON legal_precedents(precedent_strength DESC);
CREATE INDEX IF NOT EXISTS idx_precedent_type ON legal_precedents(precedent_type);
CREATE INDEX IF NOT EXISTS idx_precedent_valid ON legal_precedents(still_valid) WHERE still_valid = true;

-- ============================================================================
-- 3. CONSTITUTIONAL ANALYSES TABLE - Bill-by-bill analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL UNIQUE REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Overall assessment
    alignment_score NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- 0-1.0 scale (0-100%)
    legal_feasibility_score NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- Implementation difficulty
    implementation_risk_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Analysis details
    executive_summary TEXT,
    key_findings TEXT,
    methodology TEXT,
    
    -- Conflict analysis
    total_conflicts_identified INTEGER NOT NULL DEFAULT 0,
    critical_conflicts INTEGER NOT NULL DEFAULT 0,
    major_conflicts INTEGER NOT NULL DEFAULT 0,
    minor_conflicts INTEGER NOT NULL DEFAULT 0,
    
    -- Precedent analysis
    applicable_precedents_count INTEGER NOT NULL DEFAULT 0,
    supporting_precedents UUID[] DEFAULT ARRAY[]::uuid[],
    contradicting_precedents UUID[] DEFAULT ARRAY[]::uuid[],
    
    -- Related provisions
    aligned_provisions UUID[] DEFAULT ARRAY[]::uuid[],
    conflicting_provisions UUID[] DEFAULT ARRAY[]::uuid[],
    unclear_provisions UUID[] DEFAULT ARRAY[]::uuid[],
    
    -- Recommendations
    recommended_amendments TEXT,
    legal_safeguards_needed TEXT,
    implementation_notes TEXT,
    
    -- Expert review
    expert_opinion BOOLEAN DEFAULT false,
    expert_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expert_review_date TIMESTAMP WITH TIME ZONE,
    expert_notes TEXT,
    
    -- Likelihood of challenge
    likelihood_of_legal_challenge NUMERIC(3,2) CHECK (likelihood_of_legal_challenge >= 0 AND likelihood_of_legal_challenge <= 1.0),
    predicted_challenger VARCHAR(100),
    
    -- Analysis timing
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_bill ON constitutional_analyses(bill_id);
CREATE INDEX IF NOT EXISTS idx_analysis_alignment_score ON constitutional_analyses(alignment_score);
CREATE INDEX IF NOT EXISTS idx_analysis_risk_level ON constitutional_analyses(implementation_risk_level);
CREATE INDEX IF NOT EXISTS idx_analysis_conflicts ON constitutional_analyses(total_conflicts_identified DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_date ON constitutional_analyses(analysis_date DESC);

-- ============================================================================
-- 4. CONSTITUTIONAL CONFLICTS TABLE - Specific conflicts found
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitutional_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES constitutional_analyses(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Conflict details
    provision_id UUID NOT NULL REFERENCES constitutional_provisions(id) ON DELETE CASCADE,
    conflict_description TEXT NOT NULL,
    bill_clause_text TEXT NOT NULL,
    provision_text TEXT NOT NULL,
    
    -- Severity assessment
    severity_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    CONSTRAINT valid_severity CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
    
    -- Reasoning
    conflict_reasoning TEXT NOT NULL,
    legal_basis TEXT,
    
    -- Related cases
    related_precedent_ids UUID[] DEFAULT ARRAY[]::uuid[],
    precedent_count INTEGER NOT NULL DEFAULT 0,
    
    -- Resolution suggestions
    proposed_amendment TEXT,
    workaround_options TEXT,
    resolution_complexity VARCHAR(20), -- 'easy', 'moderate', 'difficult', 'impossible'
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflict_analysis ON constitutional_conflicts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_conflict_bill ON constitutional_conflicts(bill_id);
CREATE INDEX IF NOT EXISTS idx_conflict_provision ON constitutional_conflicts(provision_id);
CREATE INDEX IF NOT EXISTS idx_conflict_severity ON constitutional_conflicts(severity_level);
CREATE INDEX IF NOT EXISTS idx_conflict_confidence ON constitutional_conflicts(confidence_score DESC);

-- ============================================================================
-- 5. HIDDEN PROVISIONS TABLE - Unintended consequences and loopholes
-- ============================================================================
CREATE TABLE IF NOT EXISTS hidden_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES constitutional_analyses(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Provision details
    hidden_provision_text TEXT NOT NULL,
    consequence_description TEXT NOT NULL,
    severity_of_consequence VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'minor', 'moderate', 'major', 'critical'
    
    -- Analysis
    how_it_could_be_exploited TEXT,
    who_could_exploit VARCHAR(200), -- 'government', 'private_sector', 'individuals', etc.
    likelihood_of_exploitation NUMERIC(3,2) CHECK (likelihood_of_exploitation >= 0 AND likelihood_of_exploitation <= 1.0),
    
    -- Historical precedent
    similar_past_loopholes TEXT,
    how_others_handled TEXT,
    
    -- Mitigation
    can_be_prevented BOOLEAN NOT NULL DEFAULT true,
    prevention_measures TEXT,
    prevention_difficulty VARCHAR(20), -- 'easy', 'moderate', 'difficult', 'impossible'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hidden_bill ON hidden_provisions(bill_id);
CREATE INDEX IF NOT EXISTS idx_hidden_severity ON hidden_provisions(severity_of_consequence);
CREATE INDEX IF NOT EXISTS idx_hidden_likelihood ON hidden_provisions(likelihood_of_exploitation DESC);

-- ============================================================================
-- 6. IMPLEMENTATION WORKAROUNDS TABLE - Solutions to conflicts
-- ============================================================================
CREATE TABLE IF NOT EXISTS implementation_workarounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES constitutional_conflicts(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Workaround details
    workaround_title VARCHAR(255) NOT NULL,
    workaround_description TEXT NOT NULL,
    
    -- How it works
    how_it_resolves_conflict TEXT,
    legal_basis_for_workaround TEXT,
    
    -- Assessment
    effectiveness_score NUMERIC(3,2) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1.0),
    implementation_cost VARCHAR(20), -- 'minimal', 'low', 'moderate', 'high'
    time_to_implement VARCHAR(50), -- Duration estimate
    
    -- Precedent
    previously_used BOOLEAN NOT NULL DEFAULT false,
    successful_implementations TEXT,
    failed_implementations TEXT,
    
    -- Requirements
    required_amendments TEXT,
    required_regulations TEXT,
    required_agency_coordination TEXT,
    
    -- Expert review
    recommended_by_experts BOOLEAN DEFAULT false,
    expert_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workaround_conflict ON implementation_workarounds(conflict_id);
CREATE INDEX IF NOT EXISTS idx_workaround_bill ON implementation_workarounds(bill_id);
CREATE INDEX IF NOT EXISTS idx_workaround_effectiveness ON implementation_workarounds(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_workaround_recommended ON implementation_workarounds(recommended_by_experts) WHERE recommended_by_experts = true;

-- ============================================================================
-- 7. LEGAL RISKS TABLE - Overall legal risk assessment
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES constitutional_analyses(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Risk identification
    risk_category VARCHAR(100), -- 'constitutional', 'procedural', 'operational', 'implementation'
    risk_description TEXT NOT NULL,
    risk_severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Risk assessment
    probability_of_occurrence NUMERIC(3,2) CHECK (probability_of_occurrence >= 0 AND probability_of_occurrence <= 1.0),
    potential_impact TEXT,
    impact_on_beneficiaries VARCHAR(200),
    
    -- Related legal issues
    related_rights_at_risk TEXT[] DEFAULT ARRAY[]::text[],
    affected_populations TEXT,
    
    -- Mitigation
    can_be_mitigated BOOLEAN NOT NULL DEFAULT true,
    mitigation_strategies TEXT,
    mitigation_cost VARCHAR(20),
    mitigation_timeline VARCHAR(50),
    
    -- Post-implementation
    need_post_implementation_review BOOLEAN DEFAULT true,
    recommended_review_date DATE,
    review_focus_areas TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_bill ON legal_risks(bill_id);
CREATE INDEX IF NOT EXISTS idx_risk_category ON legal_risks(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_severity ON legal_risks(risk_severity);
CREATE INDEX IF NOT EXISTS idx_risk_probability ON legal_risks(probability_of_occurrence DESC);

-- ============================================================================
-- TRIGGERS - Automatic updates for analysis
-- ============================================================================

-- Trigger: Auto-calculate alignment score when conflicts change
CREATE OR REPLACE FUNCTION update_alignment_score()
RETURNS TRIGGER AS $$
DECLARE
    critical_conflicts INT;
    major_conflicts INT;
    total_conflicts INT;
    new_score NUMERIC(3,2);
BEGIN
    -- Get conflict counts
    SELECT 
        COUNT(CASE WHEN severity_level = 'critical' THEN 1 END),
        COUNT(CASE WHEN severity_level = 'major' THEN 1 END),
        COUNT(*)
    INTO critical_conflicts, major_conflicts, total_conflicts
    FROM constitutional_conflicts
    WHERE analysis_id = NEW.analysis_id;
    
    -- Calculate alignment score (starts at 1.0, decreases with conflicts)
    new_score := CASE
        WHEN critical_conflicts > 0 THEN 0.2
        WHEN major_conflicts >= 3 THEN 0.3
        WHEN major_conflicts >= 1 THEN 0.5
        WHEN total_conflicts > 0 THEN 0.7
        ELSE 0.9
    END;
    
    -- Update analysis
    UPDATE constitutional_analyses
    SET 
        alignment_score = new_score,
        total_conflicts_identified = total_conflicts,
        critical_conflicts = critical_conflicts,
        major_conflicts = major_conflicts,
        last_updated = CURRENT_TIMESTAMP
    WHERE id = NEW.analysis_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_alignment_on_conflict
    AFTER INSERT OR UPDATE OR DELETE ON constitutional_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_alignment_score();

-- ============================================================================
-- VIEWS - Easy access patterns
-- ============================================================================

-- Bills with Constitutional Concerns
CREATE OR REPLACE VIEW bills_with_constitutional_concerns AS
SELECT 
    b.id,
    b.bill_number,
    b.title,
    ca.alignment_score,
    ca.implementation_risk_level,
    COUNT(DISTINCT cc.id) as conflict_count,
    COUNT(DISTINCT CASE WHEN cc.severity_level = 'critical' THEN cc.id END) as critical_conflicts,
    COUNT(DISTINCT hp.id) as hidden_provisions_count,
    COUNT(DISTINCT lr.id) as legal_risks_count
FROM bills b
LEFT JOIN constitutional_analyses ca ON b.id = ca.bill_id
LEFT JOIN constitutional_conflicts cc ON b.id = cc.bill_id
LEFT JOIN hidden_provisions hp ON b.id = hp.bill_id
LEFT JOIN legal_risks lr ON b.id = lr.bill_id
WHERE ca.id IS NOT NULL
GROUP BY b.id, b.bill_number, b.title, ca.alignment_score, ca.implementation_risk_level
ORDER BY ca.alignment_score ASC;

-- Critical Legal Issues Summary
CREATE OR REPLACE VIEW critical_legal_issues_summary AS
SELECT 
    b.bill_number,
    b.title,
    COUNT(DISTINCT CASE WHEN cc.severity_level = 'critical' THEN cc.id END) as critical_conflicts,
    COUNT(DISTINCT hp.id) as hidden_provisions,
    COUNT(DISTINCT lr.id) as critical_risks,
    STRING_AGG(DISTINCT cp.provision_code, ', ') as affected_provisions
FROM bills b
LEFT JOIN constitutional_conflicts cc ON b.id = cc.bill_id AND cc.severity_level = 'critical'
LEFT JOIN hidden_provisions hp ON b.id = hp.bill_id
LEFT JOIN legal_risks lr ON b.id = lr.bill_id AND lr.risk_severity = 'critical'
LEFT JOIN constitutional_provisions cp ON cc.provision_id = cp.id
GROUP BY b.id, b.bill_number, b.title
HAVING COUNT(DISTINCT CASE WHEN cc.severity_level = 'critical' THEN cc.id END) > 0
    OR COUNT(DISTINCT hp.id) > 0
    OR COUNT(DISTINCT lr.id) > 0;

-- Precedent Analysis View
CREATE OR REPLACE VIEW precedent_bill_analysis AS
SELECT 
    b.id as bill_id,
    b.bill_number,
    b.title,
    COUNT(DISTINCT lp.id) as applicable_precedents,
    COUNT(DISTINCT CASE WHEN lp.still_valid = true THEN lp.id END) as valid_precedents,
    STRING_AGG(DISTINCT lp.case_citation, '; ' ORDER BY lp.decision_date DESC) as relevant_cases
FROM bills b
LEFT JOIN constitutional_analyses ca ON b.id = ca.bill_id
LEFT JOIN constitutional_conflicts cc ON ca.id = cc.analysis_id
LEFT JOIN legal_precedents lp ON lp.id = ANY(cc.related_precedent_ids)
WHERE ca.id IS NOT NULL
GROUP BY b.id, b.bill_number, b.title;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify constitutional tables
SELECT 
    'constitutional_provisions' as table_name, COUNT(*) as row_count 
FROM constitutional_provisions
UNION ALL
SELECT 'legal_precedents', COUNT(*) FROM legal_precedents
UNION ALL
SELECT 'constitutional_analyses', COUNT(*) FROM constitutional_analyses
UNION ALL
SELECT 'constitutional_conflicts', COUNT(*) FROM constitutional_conflicts
UNION ALL
SELECT 'hidden_provisions', COUNT(*) FROM hidden_provisions
UNION ALL
SELECT 'implementation_workarounds', COUNT(*) FROM implementation_workarounds
UNION ALL
SELECT 'legal_risks', COUNT(*) FROM legal_risks;
