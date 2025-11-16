-- Search Intent & Context
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query_text TEXT NOT NULL,
  query_intent VARCHAR(50), -- 'exploratory', 'specific', 'comparative', 'monitoring'
  search_context JSONB, -- User context: previous searches, viewed bills, etc.
  filters_applied JSONB,
  results_returned INTEGER,
  results_clicked INTEGER,
  query_satisfaction DECIMAL(3,2), -- Implicit satisfaction score
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_user ON search_queries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_search_created ON search_queries(created_at);

-- Discovery Patterns
CREATE TABLE discovery_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50), -- 'trending', 'controversial', 'related_cluster', 'impact_prediction'
  entity_ids UUID[] NOT NULL, -- Bills or topics involved in pattern
  pattern_strength DECIMAL(5,2), -- How strong the pattern is
  pattern_metadata JSONB, -- Details about the pattern
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Patterns are time-bound
  validation_count INTEGER DEFAULT 0 -- User validations
);

CREATE INDEX idx_discovery_type ON discovery_patterns(pattern_type);
CREATE INDEX idx_discovery_detected ON discovery_patterns(detected_at);

-- Bill Relationships
CREATE TABLE bill_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_a_id UUID REFERENCES bills(id) NOT NULL,
  bill_b_id UUID REFERENCES bills(id) NOT NULL,
  relationship_type VARCHAR(50), -- 'similar', 'conflicting', 'dependent', 'superseding'
  relationship_strength DECIMAL(5,2), -- 0-100 scale
  relationship_basis JSONB, -- Why they're related
  discovered_by VARCHAR(50), -- 'automatic', 'expert', 'community'
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (bill_a_id < bill_b_id) -- Prevent duplicates
);

CREATE INDEX idx_bill_rel_a ON bill_relationships(bill_a_id);
CREATE INDEX idx_bill_rel_b ON bill_relationships(bill_b_id);
CREATE INDEX idx_bill_rel_type ON bill_relationships(relationship_type);