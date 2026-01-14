-- ============================================================================
-- Constitutional Intelligence - SIMPLIFIED & FIXED
-- ============================================================================

-- 3. CONSTITUTIONAL ANALYSES TABLE
CREATE TABLE IF NOT EXISTS constitutional_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Analysis results
    analysis_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'error'
    
    -- Scoring
    alignment_score NUMERIC(5,2) NOT NULL DEFAULT 0, -- 0-100%
    confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0, -- How confident is this analysis
    
    -- Summary
    executive_summary TEXT,
    key_concerns TEXT,
    
    -- Conflict tracking
    total_conflicts INTEGER NOT NULL DEFAULT 0,
    critical_conflicts INTEGER NOT NULL DEFAULT 0,
    moderate_conflicts INTEGER NOT NULL DEFAULT 0,
    
    -- Precedent findings
    relevant_precedents_count INTEGER NOT NULL DEFAULT 0,
    supporting_precedents_count INTEGER NOT NULL DEFAULT 0,
    contradicting_precedents_count INTEGER NOT NULL DEFAULT 0,
    
    -- Risk assessment
    legal_risk_level VARCHAR(20) NOT NULL DEFAULT 'low', -- 'critical', 'high', 'moderate', 'low'
    implementation_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Timing
    analysis_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analysis_end_time TIMESTAMP WITH TIME ZONE,
    estimated_implementation_time VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_const_analysis_bill ON constitutional_analyses(bill_id);
CREATE INDEX IF NOT EXISTS idx_const_analysis_score ON constitutional_analyses(alignment_score);
CREATE INDEX IF NOT EXISTS idx_const_analysis_risk ON constitutional_analyses(legal_risk_level);

-- 4. CONSTITUTIONAL CONFLICTS TABLE
CREATE TABLE IF NOT EXISTS constitutional_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES constitutional_analyses(id) ON DELETE CASCADE,
    provision_id UUID NOT NULL REFERENCES constitutional_provisions(id) ON DELETE CASCADE,
    
    -- Conflict severity
    severity_level VARCHAR(20) NOT NULL DEFAULT 'moderate', -- 'critical', 'high', 'moderate', 'low'
    conflict_type VARCHAR(100), -- 'direct_contradiction', 'unintended_consequence', 'loophole', 'ambiguity'
    
    -- Conflict details
    conflict_reasoning TEXT NOT NULL,
    bill_language_in_conflict TEXT,
    provision_language_relevant TEXT,
    
    -- Resolution options
    potential_amendments TEXT[],
    amendment_complexity VARCHAR(20), -- 'simple', 'moderate', 'complex'
    
    -- Precedent reference
    related_precedent_id UUID REFERENCES legal_precedents(id) ON DELETE SET NULL,
    
    -- Status tracking
    resolution_status VARCHAR(20) DEFAULT 'identified', -- 'identified', 'acknowledged', 'resolved'
    resolution_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflict_analysis ON constitutional_conflicts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_conflict_provision ON constitutional_conflicts(provision_id);
CREATE INDEX IF NOT EXISTS idx_conflict_severity ON constitutional_conflicts(severity_level);

-- 5. HIDDEN PROVISIONS TABLE
CREATE TABLE IF NOT EXISTS hidden_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Consequence details
    consequence_type VARCHAR(100), -- 'loophole', 'unintended_benefit', 'unintended_harm', 'scope_creep'
    consequence_description TEXT NOT NULL,
    
    -- Impact assessment
    exploitation_likelihood VARCHAR(20) DEFAULT 'low', -- 'certain', 'likely', 'possible', 'unlikely'
    affected_groups TEXT,
    potential_impact TEXT,
    
    -- Mitigation
    mitigation_needed BOOLEAN DEFAULT true,
    suggested_fixes TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hidden_bill ON hidden_provisions(bill_id);
CREATE INDEX IF NOT EXISTS idx_hidden_type ON hidden_provisions(consequence_type);

-- 6. IMPLEMENTATION WORKAROUNDS TABLE
CREATE TABLE IF NOT EXISTS implementation_workarounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES constitutional_conflicts(id) ON DELETE CASCADE,
    
    -- Workaround details
    workaround_title VARCHAR(255) NOT NULL,
    workaround_description TEXT NOT NULL,
    
    -- Effectiveness
    effectiveness_score NUMERIC(5,2), -- 0-100%
    feasibility_score NUMERIC(5,2), -- 0-100%
    implementation_cost VARCHAR(100),
    time_to_implement VARCHAR(100),
    
    -- Impact
    side_effects TEXT,
    political_feasibility VARCHAR(20), -- 'high', 'moderate', 'low'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workaround_conflict ON implementation_workarounds(conflict_id);

-- 7. LEGAL RISKS TABLE
CREATE TABLE IF NOT EXISTS legal_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES constitutional_analyses(id) ON DELETE CASCADE,
    
    -- Risk identification
    risk_category VARCHAR(100), -- 'constitutional_challenge', 'implementation_barrier', 'unintended_consequence'
    risk_title VARCHAR(255) NOT NULL,
    risk_description TEXT NOT NULL,
    
    -- Risk scoring
    probability_score NUMERIC(5,2) DEFAULT 0, -- 0-100%
    impact_score NUMERIC(5,2) DEFAULT 0, -- 0-100%
    overall_risk_score NUMERIC(5,2) DEFAULT 0, -- probability * impact
    
    -- Mitigation
    mitigation_strategies TEXT[] DEFAULT ARRAY[]::text[],
    estimated_cost_mitigation VARCHAR(100),
    
    -- Status
    risk_status VARCHAR(20) DEFAULT 'identified', -- 'identified', 'mitigated', 'accepted', 'monitoring'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_analysis ON legal_risks(analysis_id);
CREATE INDEX IF NOT EXISTS idx_risk_category ON legal_risks(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_probability ON legal_risks(probability_score);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update alignment score when conflicts change
CREATE OR REPLACE FUNCTION update_alignment_on_conflict_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE constitutional_analyses
    SET 
        total_conflicts = (
            SELECT COUNT(*) FROM constitutional_conflicts 
            WHERE analysis_id = NEW.analysis_id
        ),
        critical_conflicts = (
            SELECT COUNT(*) FROM constitutional_conflicts 
            WHERE analysis_id = NEW.analysis_id AND severity_level = 'critical'
        ),
        moderate_conflicts = (
            SELECT COUNT(*) FROM constitutional_conflicts 
            WHERE analysis_id = NEW.analysis_id AND severity_level IN ('high', 'moderate')
        ),
        alignment_score = CASE 
            WHEN (SELECT COUNT(*) FROM constitutional_conflicts WHERE analysis_id = NEW.analysis_id AND severity_level = 'critical') > 0 THEN 0
            WHEN (SELECT COUNT(*) FROM constitutional_conflicts WHERE analysis_id = NEW.analysis_id) = 0 THEN 100
            ELSE 100 - (SELECT COUNT(*) * 10 FROM constitutional_conflicts WHERE analysis_id = NEW.analysis_id)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.analysis_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_alignment_on_conflict ON constitutional_conflicts;
CREATE TRIGGER trigger_update_alignment_on_conflict
AFTER INSERT OR UPDATE ON constitutional_conflicts
FOR EACH ROW
EXECUTE FUNCTION update_alignment_on_conflict_change();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES (To be created after table verification)
-- ============================================================================
-- Views removed temporarily - to be added in next migration after table verification

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table creation
SELECT 'Constitutional Intelligence Tables Created:' as status,
    COALESCE((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN (
        'constitutional_analyses', 'constitutional_conflicts', 'hidden_provisions', 
        'implementation_workarounds', 'legal_risks'
    )), 0) as tables_created;
