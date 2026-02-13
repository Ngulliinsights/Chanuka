-- ============================================================================
-- ENUM ALIGNMENT MIGRATION
-- ============================================================================
-- This migration aligns database enums with shared TypeScript enums
-- Adds missing enum values to ensure consistency across all layers
-- Date: 2026-02-11

-- ============================================================================
-- 1. USER ROLE ENUM - Add missing values
-- ============================================================================

-- Add 'public', 'expert', and 'moderator' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'public';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'expert';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- ============================================================================
-- 2. BILL STATUS ENUM - Add missing values
-- ============================================================================

-- Add missing bill status values
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'introduced';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'in_committee';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'scheduled_for_vote';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'passed';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'vetoed';

-- ============================================================================
-- 3. CHAMBER ENUM - Add missing value
-- ============================================================================

-- Add 'both' to chamber enum for bicameral bills
ALTER TYPE chamber ADD VALUE IF NOT EXISTS 'both';

-- ============================================================================
-- 4. CREATE NEW ENUMS
-- ============================================================================

-- Job Status enum for async processing
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Relationship Type enum for argument intelligence
DO $$ BEGIN
  CREATE TYPE relationship_type AS ENUM (
    'supports',
    'contradicts',
    'clarifies',
    'expands'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Argument Position enum
DO $$ BEGIN
  CREATE TYPE argument_position AS ENUM (
    'support',
    'oppose',
    'neutral',
    'conditional'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verification Status enum (comprehensive)
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'unverified',
    'pending',
    'in_progress',
    'needs_review',
    'verified',
    'approved',
    'failed',
    'rejected',
    'disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payload Type enum for audit logs
DO $$ BEGIN
  CREATE TYPE payload_type AS ENUM (
    'action_details',
    'resource_usage'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 5. UPDATE EXISTING TABLES TO USE ENUMS
-- ============================================================================

-- Note: The following updates should be done carefully in production
-- They are commented out to prevent accidental data loss
-- Uncomment and test in a staging environment first

-- Update argument_claims table to use argument_position enum
-- ALTER TABLE argument_claims 
--   ALTER COLUMN position TYPE argument_position 
--   USING position::argument_position;

-- Update argument_claims table to use verification_status enum
-- ALTER TABLE argument_claims 
--   ALTER COLUMN verification_status TYPE verification_status 
--   USING verification_status::verification_status;

-- Update argument_relationships table to use relationship_type enum
-- ALTER TABLE argument_relationships 
--   ALTER COLUMN relationship_type TYPE relationship_type 
--   USING relationship_type::relationship_type;

-- Update argument_synthesis_jobs table to use job_status enum
-- ALTER TABLE argument_synthesis_jobs 
--   ALTER COLUMN job_status TYPE job_status 
--   USING job_status::job_status;

-- Update audit_log_payloads table to use payload_type enum
-- ALTER TABLE audit_log_payloads 
--   ALTER COLUMN payload_type TYPE payload_type 
--   USING payload_type::payload_type;

-- ============================================================================
-- 6. DROP OLD CHECK CONSTRAINTS (if they exist)
-- ============================================================================

-- These constraints should be replaced by the enum types above
-- Uncomment after verifying enum migration is successful

-- ALTER TABLE argument_claims DROP CONSTRAINT IF EXISTS valid_position;
-- ALTER TABLE argument_claims DROP CONSTRAINT IF EXISTS valid_verification;
-- ALTER TABLE argument_relationships DROP CONSTRAINT IF EXISTS valid_relationship;
-- ALTER TABLE argument_synthesis_jobs DROP CONSTRAINT IF EXISTS valid_job_status;
-- ALTER TABLE audit_log_payloads DROP CONSTRAINT IF EXISTS payload_type_check;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Enum values cannot be removed once added (PostgreSQL limitation)
-- 2. Enum values are added at the end of the enum list
-- 3. To reorder enums, you must recreate the type (requires downtime)
-- 4. Always test enum migrations in staging before production
-- 5. Consider using a transaction for table updates in production
