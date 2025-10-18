-- Add missing success column to security_audit_logs table

ALTER TABLE security_audit_logs 
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;

-- Update existing records to set success based on result
UPDATE security_audit_logs 
SET success = CASE 
  WHEN result IN ('success', 'passed', 'allowed', 'granted') THEN TRUE
  WHEN result IN ('failure', 'failed', 'denied', 'blocked', 'error') THEN FALSE
  ELSE TRUE
END
WHERE success IS NULL;

COMMIT;