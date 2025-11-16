-- Expert Credentials & Verification
CREATE TABLE expert_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  credential_type VARCHAR(50) NOT NULL, -- 'academic', 'professional', 'institutional'
  institution VARCHAR(255),
  verification_method VARCHAR(50), -- 'document', 'institutional_email', 'peer_review'
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  credential_data JSONB, -- Flexible storage for credential details
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE expert_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  domain_category VARCHAR(100) NOT NULL, -- 'constitutional_law', 'healthcare', 'finance', etc.
  expertise_level VARCHAR(20), -- 'expert', 'specialist', 'practitioner'
  years_experience INTEGER,
  credential_ids UUID[] DEFAULT '{}', -- References to supporting credentials
  peer_validations INTEGER DEFAULT 0,
  community_validations INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  domain_category VARCHAR(100),
  base_score DECIMAL(5,2) DEFAULT 50.0, -- Starting credibility
  expertise_bonus DECIMAL(5,2) DEFAULT 0.0,
  community_adjustment DECIMAL(5,2) DEFAULT 0.0,
  peer_adjustment DECIMAL(5,2) DEFAULT 0.0,
  historical_accuracy DECIMAL(5,2), -- Track prediction accuracy
  final_score DECIMAL(5,2) GENERATED ALWAYS AS (
    base_score + expertise_bonus + community_adjustment + peer_adjustment
  ) STORED,
  last_calculated TIMESTAMP DEFAULT NOW(),
  calculation_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credibility_user_domain ON credibility_scores(user_id, domain_category);
CREATE INDEX idx_credibility_final_score ON credibility_scores(final_score DESC);