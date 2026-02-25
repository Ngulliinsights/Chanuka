# Migration Naming Guide

## Current State

The drizzle/ directory contains migrations with **three different naming conventions**:

### 1. Sequential Numeric (Legacy)
- `0001_create_foundation_tables.sql`
- `0001_create_foundation_tables_optimized.sql` ⚠️ Duplicate prefix
- `0021_clean_comprehensive_schema.sql`
- `0022_fix_schema_alignment.sql`
- `0023_migration_infrastructure.sql` ⚠️ Duplicate description
- `0024_migration_infrastructure.sql` ⚠️ Duplicate description
- `0025_postgresql_fulltext_enhancements.sql`
- `0026_optimize_search_indexes.sql`

### 2. Timestamp Format (Current Standard)
- `20251104110148_soft_captain_marvel.sql`
- `20251104110149_advanced_discovery.sql`
- `20251104110150_real_time_engagement.sql`
- `20251104110151_transparency_intelligence.sql`
- `20251104110152_expert_verification.sql`
- `20251117080000_intelligent_search_phase2.sql`
- `20251117104802_intelligent_search_system.sql`
- `20251223154627_database_performance_optimizations.sql`
- `20260114_phase2_argument_intelligence.sql`
- `20260114_phase2_constitutional_intelligence.sql`
- `20260114_phase2_transparency_conflicts.sql`
- `20260115_argument_intelligence_tables.sql`
- `20260115_constitutional_intelligence_fix.sql`
- `20260115_constitutional_intelligence_tables.sql`
- `20260211_enum_alignment.sql`

### 3. Epoch Timestamp (Outlier)
- `1766469695772_init_schema.sql`

## Issues

1. **Duplicate Prefixes**: Two files with `0001_` prefix
2. **Duplicate Descriptions**: Two files with `migration_infrastructure` description
3. **Mixed Formats**: Three different timestamp formats in use
4. **Empty Journal**: `meta/_journal.json` is empty, suggesting migrations may not be tracked

## Recommended Standard

**Format**: `YYYYMMDDHHMMSS_descriptive_name.sql`

Example: `20260225120000_add_user_preferences.sql`

### Benefits:
- Chronological sorting
- Human-readable dates
- Unique prefixes (down to the second)
- Consistent with most migrations already in use

## Migration Plan (DEFERRED)

⚠️ **DO NOT RENAME EXISTING MIGRATIONS** without:

1. Checking if migrations have been applied to production
2. Verifying the drizzle journal tracks execution order
3. Updating drizzle metadata to reflect new names
4. Testing on a staging database first

### Safe Approach:

1. **For New Migrations**: Use the timestamp format going forward
2. **For Existing Migrations**: Leave as-is unless you have:
   - Full database backup
   - Staging environment for testing
   - Drizzle metadata update script
   - Rollback plan

## Why This Was Deferred

Migration renaming is **high-risk** because:
- Drizzle tracks executed migrations by filename
- Renaming can cause re-execution or skipping of migrations
- Production databases may have different migration states
- The journal is currently empty (unclear state)

**Recommendation**: Address this during a dedicated database maintenance window with proper testing.

## Going Forward

**For all new migrations**, use this naming convention:

```bash
# Generate timestamp
date +%Y%m%d%H%M%S

# Create migration
touch drizzle/$(date +%Y%m%d%H%M%S)_descriptive_name.sql
```

Example:
```bash
touch drizzle/20260225120000_add_user_preferences.sql
```
