# Schema Import Issues - Fix Required

## Problem

The `server/infrastructure/schema/index.ts` file has multiple import/export issues that prevent the seed scripts from running:

1. **Missing validation schemas** - Trying to export schemas that don't exist
2. **Impact measurement schema** - Not enabled in drizzle.config.ts but being exported
3. **Circular dependencies** - Some schemas importing from each other incorrectly
4. **Wrong export paths** - Exporting items from wrong schema files

## Immediate Workaround

Since the seed scripts import directly from specific schema files (not from the index), we can temporarily disable the schema index exports.

## Quick Fix

Comment out the entire exports section in `server/infrastructure/schema/index.ts` or create a minimal version that only exports what's actually needed.

## Files Fixed So Far

1. ✓ `server/infrastructure/schema/integration.ts` - Fixed `brandId` import
2. ✓ `server/infrastructure/schema/validation-integration.ts` - Fixed `isBrandedId` import  
3. ✓ `server/infrastructure/schema/schema-generators.ts` - Fixed `brandId` import
4. ✓ `server/infrastructure/schema/integration-extended.ts` - Fixed `brandId` import
5. ✓ `server/infrastructure/schema/index.ts` - Commented out validation schema exports
6. ✓ `server/infrastructure/schema/index.ts` - Commented out impact_measurement exports
7. ✓ `server/infrastructure/schema/index.ts` - Fixed advanced_discovery exports

## Remaining Issues

The schema index still has issues with:
- `safeguards` schema exports
- Possibly other schema exports

## Recommended Solution

Create a new minimal schema index that only exports what's actually used by the application, or fix all the schema files to have correct exports.

## Alternative: Run Seeds Without Schema Index

The seed scripts can run if we ensure they don't trigger loading of the schema index. They already import directly from specific schema files.

The issue is that some schema file is importing from the index, creating a circular dependency.

## Next Steps

1. Find which schema file is importing from the index
2. Fix that import to be direct
3. Or comment out all exports in the schema index temporarily
