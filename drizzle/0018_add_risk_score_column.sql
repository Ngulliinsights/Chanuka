-- Add missing risk_score column to security_audit_logs table

ALTER TABLE security_audit_logs 
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Add index for risk_score for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_score ON security_audit_logs(risk_score);

COMMIT;