-- ============================================================================
-- FRESH DATABASE START - Drop Everything
-- ============================================================================
-- WARNING: This will destroy all data. Use only for development reset.

-- Drop all tables (cascade will handle dependencies)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Database is now completely clean and ready for fresh migrations
