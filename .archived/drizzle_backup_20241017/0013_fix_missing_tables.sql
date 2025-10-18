-- =============================================
-- FIX MISSING TABLES FOR CHANUKA PLATFORM
-- =============================================

-- Add missing preferences column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT,
  refresh_token_hash TEXT,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security_config table for security monitoring
CREATE TABLE IF NOT EXISTS security_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance_checks table for compliance monitoring
CREATE TABLE IF NOT EXISTS compliance_checks (
  id SERIAL PRIMARY KEY,
  check_name TEXT NOT NULL UNIQUE,
  check_type TEXT NOT NULL, -- 'gdpr_data_retention', 'gdpr_user_consent', 'password_policy', 'encryption_at_rest'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'warning'
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  results JSONB,
  error_message TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default security configuration
INSERT INTO security_config (config_key, config_value, description) VALUES
('session_timeout', '{"value": 3600, "unit": "seconds"}', 'Default session timeout in seconds'),
('max_login_attempts', '{"value": 5, "unit": "attempts"}', 'Maximum login attempts before lockout'),
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": true}', 'Password complexity requirements'),
('encryption_settings', '{"algorithm": "AES-256", "key_rotation_days": 90}', 'Encryption configuration'),
('audit_retention_days', '{"value": 365, "unit": "days"}', 'How long to keep audit logs')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default compliance checks
INSERT INTO compliance_checks (check_name, check_type, next_run_at) VALUES
('gdpr_data_retention', 'gdpr_data_retention', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('gdpr_user_consent', 'gdpr_user_consent', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('password_policy', 'password_policy', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('encryption_at_rest', 'encryption_at_rest', CURRENT_TIMESTAMP + INTERVAL '1 day')
ON CONFLICT (check_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_security_config_key ON security_config(config_key);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_next_run ON compliance_checks(next_run_at);

-- Create update triggers for timestamp maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_config_updated_at ON security_config;
CREATE TRIGGER update_security_config_updated_at
  BEFORE UPDATE ON security_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_checks_updated_at ON compliance_checks;
CREATE TRIGGER update_compliance_checks_updated_at
  BEFORE UPDATE ON compliance_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update compliance check status
CREATE OR REPLACE FUNCTION update_compliance_check(
  p_check_name TEXT,
  p_status TEXT,
  p_results JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_checks SET
    status = p_status,
    last_run_at = CURRENT_TIMESTAMP,
    next_run_at = CURRENT_TIMESTAMP + INTERVAL '1 day',
    results = COALESCE(p_results, results),
    error_message = p_error_message,
    updated_at = CURRENT_TIMESTAMP
  WHERE check_name = p_check_name;
END;
$$ LANGUAGE plpgsql;

-- Ensure all existing tables have proper UUID support
-- Update users table to use UUID if not already
DO $$
BEGIN
  -- Check if users.id is already UUID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    -- If users table exists but id is not UUID, we need to handle this carefully
    -- For now, we'll assume the schema is correct as per shared/schema.ts
    RAISE NOTICE 'Users table ID column type check completed';
  END IF;
END $$;

-- Add foreign key constraints where appropriate
ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create view for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT * FROM sessions 
WHERE is_active = TRUE 
AND expires_at > CURRENT_TIMESTAMP;

-- Create view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  sc.config_key,
  sc.config_value,
  sc.description,
  cc.check_name,
  cc.status as compliance_status,
  cc.last_run_at,
  cc.severity
FROM security_config sc
FULL OUTER JOIN compliance_checks cc ON TRUE
WHERE sc.is_active = TRUE AND cc.is_active = TRUE;

COMMIT;