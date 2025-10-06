-- Fix schema errors identified in terminal output

-- 1. Create missing password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing updated_by column to security_config table
ALTER TABLE security_config 
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 3. Add missing description column to compliance_checks table
ALTER TABLE compliance_checks 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- 5. Add foreign key constraint for password_resets
ALTER TABLE password_resets 
ADD CONSTRAINT fk_password_resets_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Update existing compliance_checks records to have descriptions
UPDATE compliance_checks SET description = 
  CASE check_name
    WHEN 'gdpr_data_retention' THEN 'Ensures data retention policies comply with GDPR requirements'
    WHEN 'gdpr_user_consent' THEN 'Verifies user consent mechanisms meet GDPR standards'
    WHEN 'password_policy' THEN 'Validates password complexity and security requirements'
    WHEN 'encryption_at_rest' THEN 'Confirms data encryption at rest is properly implemented'
    ELSE 'Compliance check for ' || check_name
  END
WHERE description IS NULL;

-- 7. Create cleanup function for password resets
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_resets
  WHERE expires_at < CURRENT_TIMESTAMP OR used = TRUE
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;