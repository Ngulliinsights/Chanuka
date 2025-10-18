-- Add missing last_checked column to compliance_checks table

ALTER TABLE compliance_checks 
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE;

-- Update existing records to have a last_checked value
UPDATE compliance_checks 
SET last_checked = last_run_at 
WHERE last_checked IS NULL AND last_run_at IS NOT NULL;

-- For records without last_run_at, set to created_at
UPDATE compliance_checks 
SET last_checked = created_at 
WHERE last_checked IS NULL;

COMMIT;