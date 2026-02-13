# Database Migration Process Guide

## Overview

This guide documents the complete database migration process for the Chanuka Platform, including pre-migration verification, migration execution, post-migration verification, and rollback procedures.

The migration system ensures that all database schema changes preserve type alignment, API contract compatibility, and validation schema consistency across the full stack.

## Table of Contents

1. [Migration Workflow](#migration-workflow)
2. [Pre-Migration Verification](#pre-migration-verification)
3. [Migration Execution](#migration-execution)
4. [Post-Migration Verification](#post-migration-verification)
5. [Rollback Process](#rollback-process)
6. [Verification Reports](#verification-reports)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Migration Workflow

The complete migration workflow consists of five steps:

```
1. Pre-Migration Verification
   ↓
2. Migration Execution (if verification passes)
   ↓
3. Post-Migration Verification
   ↓
4. Success or Rollback Decision
   ↓
5. Rollback Verification (if rollback needed)
```

## Pre-Migration Verification

Before applying any migration, the system verifies that the current state is consistent and that the migration won't break existing integrations.

### Running Pre-Migration Verification

```bash
# Verify current state before migration
npm run db:verify

# Or use the script directly
tsx scripts/database/migration-verification-framework.ts
```

### What Gets Verified

1. **Type Alignment**: Database schema types match TypeScript type definitions
2. **API Contract Compatibility**: API contracts are consistent with types
3. **Validation Schema Consistency**: Validation schemas align with types and database constraints

### Verification Output

The verification generates a detailed report:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "migrationName": "add_user_bio_field",
  "typeAlignment": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "apiContractCompatibility": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "validationSchemaConsistency": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "overallPassed": true,
  "summary": {
    "totalErrors": 0,
    "totalWarnings": 0,
    "criticalIssues": []
  }
}
```

### Critical Issues

If critical issues are found, the migration will NOT proceed. Critical issues include:

- Missing type definitions for database tables
- Type mismatches between schema and TypeScript types
- Nullability mismatches
- Missing API contracts for endpoints
- Validation schema inconsistencies

## Migration Execution

Once pre-migration verification passes, you can safely apply the migration.

### Running Migration with Verification

```bash
# Run migration with automatic verification
npm run db:migrate-verified

# Or use the script directly
tsx scripts/database/migrate-with-verification.ts

# Migrate specific migration
tsx scripts/database/migrate-with-verification.ts 0001_add_user_bio
```

### Migration Process Steps

1. **Pre-Migration Verification**: Verifies current state
2. **Migration Execution**: Applies the migration using Drizzle
3. **Post-Migration Verification**: Verifies new state
4. **Report Generation**: Creates detailed migration result

### Migration Output

```
🚀 Starting verified migration process...

═══════════════════════════════════════════════════════════
STEP 1: PRE-MIGRATION VERIFICATION
═══════════════════════════════════════════════════════════

🔍 Starting migration verification...
✅ Type alignment verification passed
✅ API contract compatibility verification passed
✅ Validation schema consistency verification passed

✅ Pre-migration verification passed!

═══════════════════════════════════════════════════════════
STEP 2: APPLYING MIGRATION
═══════════════════════════════════════════════════════════

Running drizzle-kit migrate...
✅ Migration applied successfully!

═══════════════════════════════════════════════════════════
STEP 3: POST-MIGRATION VERIFICATION
═══════════════════════════════════════════════════════════

🔍 Starting migration verification...
✅ Type alignment verification passed
✅ API contract compatibility verification passed
✅ Validation schema consistency verification passed

✅ Post-migration verification passed!

═══════════════════════════════════════════════════════════
✅ MIGRATION COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════
```

## Post-Migration Verification

After the migration is applied, the system automatically verifies that:

1. All type alignments are still valid
2. API contracts remain compatible
3. Validation schemas are still consistent
4. No new critical issues were introduced

If post-migration verification fails, consider rolling back the migration.

## Rollback Process

If a migration causes issues, you can roll it back with verification.

### Running Rollback with Verification

```bash
# Rollback most recent migration with verification
npm run db:rollback-verified

# Or use the script directly
tsx scripts/database/rollback-with-verification.ts

# Rollback specific migration
tsx scripts/database/rollback-with-verification.ts 0001_add_user_bio
```

### Rollback Process Steps

1. **Pre-Rollback Verification**: Captures current state
2. **Rollback Execution**: Rolls back the migration
3. **Post-Rollback Verification**: Verifies restored state
4. **Restoration Analysis**: Compares pre and post states
5. **Report Generation**: Creates detailed rollback result

### Rollback Output

```
🔄 Starting verified rollback process...

═══════════════════════════════════════════════════════════
STEP 1: PRE-ROLLBACK VERIFICATION
═══════════════════════════════════════════════════════════

Capturing current state...
Pre-rollback state captured:
- Type alignment errors: 2
- API contract errors: 0
- Validation errors: 1
- Total critical issues: 3

═══════════════════════════════════════════════════════════
STEP 2: PERFORMING ROLLBACK
═══════════════════════════════════════════════════════════

Rolling back migration...
✅ Rollback completed!

═══════════════════════════════════════════════════════════
STEP 3: POST-ROLLBACK VERIFICATION
═══════════════════════════════════════════════════════════

Verifying restored state...
Post-rollback state:
- Type alignment errors: 0
- API contract errors: 0
- Validation errors: 0
- Total critical issues: 0

═══════════════════════════════════════════════════════════
STEP 4: ANALYZING RESTORATION
═══════════════════════════════════════════════════════════

Restoration Analysis:
- Type alignment restored: ✅
- API contracts restored: ✅
- Validation schemas restored: ✅
- Issues resolved: 3
- New issues introduced: 0

Issues resolved by rollback:
   ✓ User: Missing field 'bio' in type definition
   ✓ User: Type mismatch for field 'bio'
   ✓ User: Validation schema missing 'bio' field

═══════════════════════════════════════════════════════════
✅ ROLLBACK COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════
```

### Testing Rollback Capability

You can test the rollback verification system without actually rolling back:

```bash
# Test rollback verification capability
tsx scripts/database/rollback-with-verification.ts --test
```

## Verification Reports

All verification operations generate detailed JSON reports.

### Report Locations

- **Migration Verification**: `migration-verification-report.json`
- **Migration Result**: `migration-result.json`
- **Rollback Result**: `rollback-result.json`

### Report Structure

#### Migration Verification Report

```typescript
interface MigrationVerificationReport {
  timestamp: string;
  migrationName?: string;
  typeAlignment: {
    passed: boolean;
    errors: VerificationError[];
    warnings: VerificationWarning[];
    timestamp: string;
  };
  apiContractCompatibility: {
    passed: boolean;
    errors: VerificationError[];
    warnings: VerificationWarning[];
    timestamp: string;
  };
  validationSchemaConsistency: {
    passed: boolean;
    errors: VerificationError[];
    warnings: VerificationWarning[];
    timestamp: string;
  };
  overallPassed: boolean;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: string[];
  };
}
```

#### Verification Error

```typescript
interface VerificationError {
  type: string;
  entity: string;
  field?: string;
  message: string;
  details?: Record<string, any>;
}
```

### Error Types

- `MISSING_TYPE`: Database table has no corresponding TypeScript type
- `MISSING_FIELD_IN_TYPE`: Database field missing in TypeScript type
- `MISSING_FIELD_IN_SCHEMA`: TypeScript field missing in database schema
- `TYPE_MISMATCH`: Field types don't match between schema and type
- `NULLABILITY_MISMATCH`: Nullability differs between schema and type
- `MISSING_API_CONTRACT`: Endpoint has no API contract definition
- `MISSING_VALIDATION_SCHEMA`: Entity has no validation schema

## Error Handling

### Migration Fails Pre-Verification

If pre-migration verification fails:

1. Migration will NOT be applied
2. Review the verification report
3. Fix the critical issues
4. Run verification again
5. Proceed with migration once verification passes

### Migration Fails Post-Verification

If post-migration verification fails:

1. Migration was applied but introduced issues
2. Review the verification report
3. Consider rolling back the migration
4. Fix the issues in the migration
5. Re-apply the migration

### Rollback Fails

If rollback fails:

1. Review the rollback output
2. Check database state manually
3. May need manual intervention
4. Contact database administrator if needed

## Best Practices

### Before Creating a Migration

1. **Review Current State**: Run verification to ensure clean starting point
2. **Plan Changes**: Document what the migration will change
3. **Update Types First**: Update TypeScript types to match planned schema
4. **Update Validation**: Update validation schemas to match new types
5. **Update API Contracts**: Update API contracts if endpoints are affected

### Creating the Migration

1. **Use Drizzle Kit**: Generate migrations using `drizzle-kit generate`
2. **Review SQL**: Always review the generated SQL before applying
3. **Test Locally**: Test migration on local database first
4. **Small Changes**: Keep migrations small and focused
5. **Reversible**: Ensure migrations can be rolled back

### Applying the Migration

1. **Use Verified Migration**: Always use `migrate-with-verification`
2. **Backup Database**: Take database backup before migration
3. **Monitor Logs**: Watch the migration output for errors
4. **Verify Reports**: Review verification reports after migration
5. **Test Application**: Test affected features after migration

### After Migration

1. **Run Tests**: Run full test suite to verify functionality
2. **Monitor Errors**: Watch for runtime errors in production
3. **Document Changes**: Update documentation if schema changed
4. **Communicate**: Inform team of schema changes
5. **Keep Reports**: Archive verification reports for audit trail

## Troubleshooting

### Verification Takes Too Long

- Check database connection
- Verify schema files are accessible
- Check for large number of type definitions
- Consider optimizing verification queries

### Type Alignment Errors

- Ensure database schema is up to date
- Verify TypeScript types are exported correctly
- Check for naming mismatches (camelCase vs snake_case)
- Ensure all tables have corresponding types

### API Contract Errors

- Verify API contract files exist
- Check that endpoints use shared types
- Ensure request/response types are defined
- Verify validation schemas exist

### Validation Schema Errors

- Check that validation schemas are exported
- Verify schemas match TypeScript types
- Ensure database constraints align with validation
- Check for missing required fields

### Migration Fails to Apply

- Review Drizzle error messages
- Check database connection
- Verify migration SQL syntax
- Ensure database user has required permissions
- Check for conflicting migrations

### Rollback Doesn't Restore State

- Review rollback SQL
- Check if migration is reversible
- Verify database state manually
- May need to manually fix issues
- Consider restoring from backup

## Related Documentation

- [Migration Verification Framework](../../scripts/database/migration-verification-framework.ts)
- [Migrate with Verification Script](../../scripts/database/migrate-with-verification.ts)
- [Rollback with Verification Script](../../scripts/database/rollback-with-verification.ts)
- [Database Schema Guide](../../server/infrastructure/schema/README.md)
- [Type System Overview](../../shared/types/README.md)
- [API Contracts](../../shared/types/api/README.md)
- [Validation Schemas](../../shared/validation/README.md)

## Requirements Satisfied

- **Requirement 6.1**: Migration verification before applying changes
- **Requirement 6.4**: Pre-migration verification step that fails migration if issues found
- **Requirement 6.5**: Rollback verification that ensures alignments are restored

## Support

For issues or questions about the migration process:

1. Review this documentation
2. Check verification reports for details
3. Review related documentation
4. Contact the platform team
5. Create an issue in the project repository
