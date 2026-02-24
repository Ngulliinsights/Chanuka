-- Pretext Detection Tables
-- Migration for pretext detection feature

-- Create pretext_analyses table
CREATE TABLE IF NOT EXISTS pretext_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id VARCHAR(255) NOT NULL UNIQUE,
  detections JSONB NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create pretext_alerts table
CREATE TABLE IF NOT EXISTS pretext_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id VARCHAR(255) NOT NULL,
  detections JSONB NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bill FOREIGN KEY (bill_id) REFERENCES pretext_analyses(bill_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pretext_analyses_bill_id ON pretext_analyses(bill_id);
CREATE INDEX IF NOT EXISTS idx_pretext_analyses_score ON pretext_analyses(score);
CREATE INDEX IF NOT EXISTS idx_pretext_analyses_analyzed_at ON pretext_analyses(analyzed_at);

CREATE INDEX IF NOT EXISTS idx_pretext_alerts_bill_id ON pretext_alerts(bill_id);
CREATE INDEX IF NOT EXISTS idx_pretext_alerts_status ON pretext_alerts(status);
CREATE INDEX IF NOT EXISTS idx_pretext_alerts_created_at ON pretext_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_pretext_alerts_score ON pretext_alerts(score);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_pretext_analyses_updated_at
  BEFORE UPDATE ON pretext_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pretext_alerts_updated_at
  BEFORE UPDATE ON pretext_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE pretext_analyses IS 'Stores pretext detection analysis results for bills';
COMMENT ON TABLE pretext_alerts IS 'Stores alerts generated from high-risk pretext detections';
COMMENT ON COLUMN pretext_analyses.detections IS 'JSON array of detected pretext indicators';
COMMENT ON COLUMN pretext_analyses.score IS 'Risk score from 0-100';
COMMENT ON COLUMN pretext_analyses.confidence IS 'Confidence level from 0-100';
COMMENT ON COLUMN pretext_alerts.status IS 'Alert status: pending, approved, or rejected';
