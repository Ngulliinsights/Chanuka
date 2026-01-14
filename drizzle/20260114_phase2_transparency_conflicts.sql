-- ============================================================================
-- MIGRATION: Phase 2 Features - Transparency & Conflict Detection
-- Description: Create financial disclosure, conflict detection, and influence tracking
-- Date: 2026-01-14
-- ============================================================================

-- ============================================================================
-- FINANCIAL DISCLOSURE & TRANSPARENCY TABLES
-- ============================================================================

-- Financial Interests: Sponsor financial disclosures
CREATE TABLE IF NOT EXISTS financial_interests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    
    -- Interest description
    interest_type varchar(100) NOT NULL, -- "business", "property", "investment", "directorship", "consultancy"
    interest_description text NOT NULL,
    interest_entity varchar(255), -- Company/entity name
    
    -- Financial value ranges
    estimated_value_min numeric(15,2),
    estimated_value_max numeric(15,2),
    currency varchar(3) DEFAULT 'KES', -- Kenyan Shilling
    
    -- Ownership details
    ownership_percentage numeric(5,2),
    ownership_type varchar(50), -- "direct", "indirect", "spouse", "trust"
    
    -- Timeline
    acquisition_date date,
    disposal_date date,
    is_current boolean NOT NULL DEFAULT true,
    
    -- Disclosure metadata
    disclosure_date date NOT NULL,
    disclosure_period varchar(20), -- "2024", "2025", etc.
    
    -- Risk flags
    is_active_during_bill_review boolean NOT NULL DEFAULT false,
    potential_conflict_flag boolean NOT NULL DEFAULT false,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_interests_sponsor ON financial_interests(sponsor_id);
CREATE INDEX idx_financial_interests_conflict_flag ON financial_interests(potential_conflict_flag) WHERE potential_conflict_flag = true;
CREATE INDEX idx_financial_interests_active ON financial_interests(is_current) WHERE is_current = true;

-- Conflict Detections: Automated conflict alerts
CREATE TABLE IF NOT EXISTS conflict_detections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    financial_interest_id uuid REFERENCES financial_interests(id) ON DELETE SET NULL,
    
    -- Conflict details
    conflict_type varchar(50) NOT NULL, -- "direct_interest", "business_association", "familial", "political_contribution"
    conflict_description text NOT NULL,
    
    -- Severity assessment
    severity_level varchar(20) NOT NULL DEFAULT 'medium', -- "low", "medium", "high", "critical"
    confidence_score numeric(5,2) NOT NULL, -- 0.00 to 100.00
    
    -- Recommendation
    recommendation varchar(100), -- "recusal_recommended", "disclosure_required", "monitoring", "clear"
    
    -- Evidence
    evidence_links text[] DEFAULT ARRAY[]::text[], -- URLs or document references
    evidence_summary text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflict_detections_bill_sponsor ON conflict_detections(bill_id, sponsor_id);
CREATE INDEX idx_conflict_detections_severity ON conflict_detections(severity_level) WHERE severity_level IN ('high', 'critical');
CREATE INDEX idx_conflict_detections_confidence ON conflict_detections(confidence_score DESC);

-- Influence Networks: Relationship mapping between actors
CREATE TABLE IF NOT EXISTS influence_networks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    target_entity_id uuid NOT NULL,
    target_entity_type varchar(50) NOT NULL, -- "sponsor", "organization", "government", "media"
    
    -- Relationship type
    relationship_type varchar(50) NOT NULL, -- "funding", "employment", "partnership", "advocacy", "familial"
    relationship_strength numeric(5,2) NOT NULL DEFAULT 50, -- 0.00 to 100.00
    
    -- Influence metrics
    influence_score numeric(5,2) NOT NULL DEFAULT 50, -- 0.00 to 100.00
    influence_category varchar(50), -- "direct", "indirect", "hidden"
    is_active boolean NOT NULL DEFAULT true,
    
    -- Timeline
    start_date date,
    end_date date,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_influence_networks_source ON influence_networks(source_entity_id);
CREATE INDEX idx_influence_networks_target ON influence_networks(target_entity_id, target_entity_type);
CREATE INDEX idx_influence_networks_active_strength ON influence_networks(is_active, relationship_strength DESC)
    WHERE is_active = true;

-- Stakeholder Positions: Organization stances on bills
CREATE TABLE IF NOT EXISTS stakeholder_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    stakeholder_id uuid NOT NULL, -- Organization or entity ID
    stakeholder_name varchar(255) NOT NULL,
    stakeholder_type varchar(50) NOT NULL, -- "ngo", "business", "government", "union", "faith_group"
    
    -- Position
    position varchar(20) NOT NULL, -- "support", "oppose", "neutral", "conditional"
    position_statement text,
    position_strength varchar(20) DEFAULT 'moderate', -- "weak", "moderate", "strong", "very_strong"
    
    -- Justification
    key_concerns text[] DEFAULT ARRAY[]::text[],
    proposed_amendments text,
    
    -- Evidence
    position_evidence_url varchar(500),
    evidence_date date,
    
    -- Engagement
    public_statement boolean NOT NULL DEFAULT false,
    statement_date date,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_stakeholder_positions_bill ON stakeholder_positions(bill_id);
CREATE INDEX idx_stakeholder_positions_stakeholder ON stakeholder_positions(stakeholder_id, stakeholder_type);
CREATE INDEX idx_stakeholder_positions_position ON stakeholder_positions(position);

-- Political Appointments: Government positions held
CREATE TABLE IF NOT EXISTS political_appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    
    -- Appointment details
    position_title varchar(255) NOT NULL,
    appointing_body varchar(255) NOT NULL, -- Who made the appointment
    
    -- Timeline
    appointment_date date NOT NULL,
    end_date date,
    is_current boolean NOT NULL DEFAULT true,
    
    -- Scope
    jurisdiction varchar(100), -- Country, county, sector
    responsibility_areas text[] DEFAULT ARRAY[]::text[],
    
    -- Financial benefit
    salary_range varchar(50),
    benefits text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_political_appointments_sponsor ON political_appointments(sponsor_id);
CREATE INDEX idx_political_appointments_current ON political_appointments(is_current) WHERE is_current = true;

-- Transparency Verification: Track disclosure completeness
CREATE TABLE IF NOT EXISTS transparency_verification (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    
    -- Verification details
    verification_period varchar(20) NOT NULL, -- "2024", "2025"
    disclosure_status varchar(20) NOT NULL DEFAULT 'pending', -- "pending", "disclosed", "incomplete", "withheld"
    
    -- Coverage metrics
    financial_interests_disclosed integer NOT NULL DEFAULT 0,
    appointments_disclosed integer NOT NULL DEFAULT 0,
    associations_disclosed integer NOT NULL DEFAULT 0,
    completeness_percentage numeric(5,2) DEFAULT 0, -- 0.00 to 100.00
    
    -- Issues found
    issues_identified text[] DEFAULT ARRAY[]::text[],
    missing_disclosures text,
    
    -- Verification result
    verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
    verified_at timestamp with time zone,
    verification_notes text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_transparency_verification_sponsor ON transparency_verification(sponsor_id, verification_period);
CREATE INDEX idx_transparency_verification_status ON transparency_verification(disclosure_status);

-- ============================================================================
-- REGULATORY CAPTURE INDICATORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_capture_indicators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Indicator assessment
    indicator_type varchar(50) NOT NULL, -- "industry_authorship", "revolving_door", "lobbying_intensity", "benefit_concentration"
    indicator_name varchar(255) NOT NULL,
    risk_score numeric(5,2) NOT NULL, -- 0.00 to 100.00
    risk_level varchar(20), -- "low", "medium", "high"
    
    -- Evidence
    evidence_description text,
    supporting_evidence text[] DEFAULT ARRAY[]::text[],
    
    -- Impact
    potential_beneficiaries text[] DEFAULT ARRAY[]::text[],
    estimated_impact text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_regulatory_capture_bill ON regulatory_capture_indicators(bill_id);
CREATE INDEX idx_regulatory_capture_risk ON regulatory_capture_indicators(risk_score DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger: Detect conflicts when financial interest is added
CREATE OR REPLACE FUNCTION detect_conflicts_on_financial_interest()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conflict flag if new interest matches active bills
    UPDATE financial_interests SET
        is_active_during_bill_review = true,
        potential_conflict_flag = true
    WHERE id = NEW.id
    AND exists(
        SELECT 1 FROM bills 
        WHERE status IN ('committee_stage', 'report_stage', 'second_reading', 'third_reading')
        AND introduced_date <= NEW.disclosure_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_conflicts
    AFTER INSERT ON financial_interests
    FOR EACH ROW
    EXECUTE FUNCTION detect_conflicts_on_financial_interest();

-- ============================================================================
-- PERMISSIONS AND GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON financial_interests TO "public";
GRANT SELECT, INSERT, UPDATE ON conflict_detections TO "public";
GRANT SELECT ON influence_networks TO "public";
GRANT SELECT ON stakeholder_positions TO "public";
GRANT SELECT ON political_appointments TO "public";
GRANT SELECT, INSERT, UPDATE ON transparency_verification TO "public";
GRANT SELECT ON regulatory_capture_indicators TO "public";

-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS
-- ============================================================================

ALTER TABLE influence_networks ADD CONSTRAINT no_self_influence 
    CHECK (source_entity_id != target_entity_id);

ALTER TABLE financial_interests ADD CONSTRAINT valid_value_range 
    CHECK (estimated_value_max IS NULL OR estimated_value_min IS NULL OR estimated_value_min <= estimated_value_max);

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

INSERT INTO __drizzle_migrations__ (hash, created_at)
VALUES (
    'phase2_transparency_conflicts_20260114',
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
    'financial_interests', 'conflict_detections', 'influence_networks', 
    'stakeholder_positions', 'political_appointments', 'transparency_verification',
    'regulatory_capture_indicators'
)
ORDER BY table_name;

-- Count tables created
SELECT COUNT(*) as tables_created FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'financial_interests', 'conflict_detections', 'influence_networks', 
    'stakeholder_positions', 'political_appointments', 'transparency_verification',
    'regulatory_capture_indicators'
);
*/
