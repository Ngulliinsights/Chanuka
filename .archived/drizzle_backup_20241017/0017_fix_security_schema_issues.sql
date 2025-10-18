-- Fix security monitoring schema issues
-- This migration adds missing columns that are causing security monitoring failures

-- 1. Add missing timestamp column to security_audit_logs table
ALTER TABLE security_audit_logs 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Create compliance_checks table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_checks (
  id SERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  check_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  next_check TIMESTAMP WITH TIME ZONE,
  findings JSONB,
  remediation TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  automated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update threat_intelligence table to match expected schema
-- First, check if the table exists and has the old structure
DO $$
BEGIN
  -- Add ip_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threat_intelligence' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE threat_intelligence ADD COLUMN ip_address TEXT;
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threat_intelligence' AND column_name = 'first_seen'
  ) THEN
    ALTER TABLE threat_intelligence ADD COLUMN first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threat_intelligence' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE threat_intelligence ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threat_intelligence' AND column_name = 'occurrences'
  ) THEN
    ALTER TABLE threat_intelligence ADD COLUMN occurrences INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threat_intelligence' AND column_name = 'blocked'
  ) THEN
    ALTER TABLE threat_intelligence ADD COLUMN blocked BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_check_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_next_check ON compliance_checks(next_check);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_last_checked ON compliance_checks(last_checked);

CREATE INDEX IF NOT EXISTS idx_threat_intelligence_ip_address ON threat_intelligence(ip_address);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_threat_type ON threat_intelligence(threat_type);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_blocked ON threat_intelligence(blocked);

-- 5. Insert default compliance checks if they don't exist
INSERT INTO compliance_checks (check_name, check_type, description, next_check) VALUES
('gdpr_data_retention', 'gdpr', 'Ensures data retention policies comply with GDPR requirements', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('gdpr_user_consent', 'gdpr', 'Validates user consent management and tracking', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('password_policy', 'security', 'Checks password policy compliance and enforcement', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('encryption_at_rest', 'security', 'Validates data encryption at rest implementation', CURRENT_TIMESTAMP + INTERVAL '1 day')
ON CONFLICT (check_name) DO NOTHING;

-- 6. Create update trigger for compliance_checks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_compliance_checks_updated_at ON compliance_checks;
CREATE TRIGGER update_compliance_checks_updated_at
  BEFORE UPDATE ON compliance_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Update existing security_audit_logs records to have timestamp if null
UPDATE security_audit_logs 
SET timestamp = created_at 
WHERE timestamp IS NULL AND created_at IS NOT NULL;

-- 8. Update existing threat_intelligence records to populate new columns
UPDATE threat_intelligence 
SET 
  first_seen = COALESCE(first_seen, created_at, CURRENT_TIMESTAMP),
  last_seen = COALESCE(last_seen, updated_at, created_at, CURRENT_TIMESTAMP),
  occurrences = COALESCE(occurrences, 1),
  blocked = COALESCE(blocked, false)
WHERE first_seen IS NULL OR last_seen IS NULL OR occurrences IS NULL OR blocked IS NULL;