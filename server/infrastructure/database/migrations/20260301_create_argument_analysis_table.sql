-- Migration: Create argument_analysis table
-- Date: 2026-03-01
-- Purpose: Store AI-powered argument analysis for comments

CREATE TABLE IF NOT EXISTS argument_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL UNIQUE REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Quality Metrics (0.0 to 1.0 scale)
  quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 10),
  evidence_strength DECIMAL(3,2) CHECK (evidence_strength >= 0 AND evidence_strength <= 1),
  logical_validity DECIMAL(3,2) CHECK (logical_validity >= 0 AND logical_validity <= 1),
  clarity DECIMAL(3,2) CHECK (clarity >= 0 AND clarity <= 1),
  relevance DECIMAL(3,2) CHECK (relevance >= 0 AND relevance <= 1),
  
  -- Structured Analysis (JSONB for flexibility)
  detected_fallacies JSONB DEFAULT '[]'::jsonb,
  claims JSONB DEFAULT '[]'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  suggested_improvements JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  reasoning_type VARCHAR(50),
  coherence_score DECIMAL(3,2),
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_argument_analysis_comment_id ON argument_analysis(comment_id);
CREATE INDEX idx_argument_analysis_quality_score ON argument_analysis(quality_score DESC);
CREATE INDEX idx_argument_analysis_evidence_strength ON argument_analysis(evidence_strength DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_argument_analysis_fallacies ON argument_analysis USING GIN (detected_fallacies);
CREATE INDEX idx_argument_analysis_claims ON argument_analysis USING GIN (claims);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_argument_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER argument_analysis_updated_at
  BEFORE UPDATE ON argument_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_argument_analysis_updated_at();

-- Comments
COMMENT ON TABLE argument_analysis IS 'AI-powered analysis of comment arguments';
COMMENT ON COLUMN argument_analysis.quality_score IS 'Overall argument quality (0-10)';
COMMENT ON COLUMN argument_analysis.evidence_strength IS 'Strength of evidence provided (0-1)';
COMMENT ON COLUMN argument_analysis.detected_fallacies IS 'Array of detected logical fallacies';
COMMENT ON COLUMN argument_analysis.claims IS 'Extracted claims from the argument';
COMMENT ON COLUMN argument_analysis.evidence IS 'Extracted evidence supporting claims';
