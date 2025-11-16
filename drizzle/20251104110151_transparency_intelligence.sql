-- Financial Disclosures
CREATE TABLE financial_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id) NOT NULL,
  disclosure_year INTEGER NOT NULL,
  disclosure_type VARCHAR(50), -- 'annual', 'quarterly', 'transaction'
  source VARCHAR(100), -- 'official_filing', 'public_record', 'investigation'
  filing_date DATE,
  disclosure_data JSONB NOT NULL, -- Flexible storage for disclosure details
  verification_status VARCHAR(20) DEFAULT 'unverified',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE financial_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID REFERENCES financial_disclosures(id) NOT NULL,
  interest_type VARCHAR(50) NOT NULL, -- 'stock', 'business', 'property', 'income'
  entity_name VARCHAR(255),
  industry_sector VARCHAR(100),
  estimated_value_min DECIMAL(15,2),
  estimated_value_max DECIMAL(15,2),
  ownership_percentage DECIMAL(5,2),
  interest_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conflict_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) NOT NULL,
  sponsor_id UUID REFERENCES sponsors(id) NOT NULL,
  conflict_type VARCHAR(50) NOT NULL, -- 'financial', 'employment', 'familial', 'organizational'
  severity_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  confidence_score DECIMAL(5,2), -- AI confidence in detection
  detection_method VARCHAR(50), -- 'automatic', 'manual', 'hybrid'
  evidence_data JSONB NOT NULL, -- Supporting evidence
  reviewed_by_expert BOOLEAN DEFAULT FALSE,
  expert_consensus VARCHAR(20), -- 'confirmed', 'disputed', 'unclear'
  public_disclosure_quality VARCHAR(20), -- 'complete', 'partial', 'inadequate'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE influence_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_type VARCHAR(50) NOT NULL, -- 'sponsor', 'organization', 'industry'
  source_entity_id UUID NOT NULL,
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type VARCHAR(50), -- 'financial', 'employment', 'board_membership', 'donation'
  relationship_strength DECIMAL(5,2), -- 0-100 scale
  evidence_sources JSONB,
  active_from DATE,
  active_to DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conflicts_bill ON conflict_detections(bill_id);
CREATE INDEX idx_conflicts_sponsor ON conflict_detections(sponsor_id);
CREATE INDEX idx_conflicts_severity ON conflict_detections(severity_level);
CREATE INDEX idx_influence_source ON influence_networks(source_entity_type, source_entity_id);
CREATE INDEX idx_influence_target ON influence_networks(target_entity_type, target_entity_id);

-- Workaround Tracking
CREATE TABLE implementation_workarounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_bill_id UUID REFERENCES bills(id) NOT NULL,
  workaround_type VARCHAR(50), -- 'executive_order', 'administrative_rule', 'court_decision', 'budget_allocation'
  workaround_document_id VARCHAR(255),
  implementing_body VARCHAR(255), -- Which entity implemented the workaround
  implementation_date DATE,
  provisions_reimplemented TEXT[], -- Which rejected provisions were reimplemented
  similarity_score DECIMAL(5,2), -- How similar to original bill
  detection_method VARCHAR(50),
  status VARCHAR(20), -- 'active', 'challenged', 'overturned'
  workaround_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workarounds_bill ON implementation_workarounds(original_bill_id);
CREATE INDEX idx_workarounds_type ON implementation_workarounds(workaround_type);