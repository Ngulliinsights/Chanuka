# Validation Schema Alignment Implementation

**Date**: 2026-02-13  
**Task**: Implement recommendations from CONSTRAINT_VALIDATION_AUDIT.md  
**Status**: Completed

## Summary

Implemented immediate recommendations from the constraint validation audit to align Zod validation schemas with database constraints. This ensures consistency between application-level and database-level validation, preventing runtime errors and data integrity issues.

## Changes Implemented

### 1. User Schema Separation

**File**: `shared/validation/schemas/user.schema.ts`

**Changes**:
- Split single `UserSchema` into three schemas:
  - `UserSchema`: Maps to `users` table only (id, email, username, role, is_active)
  - `UserProfileSchema`: Maps to `user_profiles` table (first_name, last_name, display_name, bio, phone_number, is_public)
  - `UserWithProfileSchema`: Combined schema for convenience in forms

**Field Updates**:
- `first_name`: Max length updated from 50 to 100 chars (matches DB varchar(100))
- `last_name`: Max length updated from 50 to 100 chars (matches DB varchar(100))
- `phone`: Renamed to `phone_number` and limited to 20 chars (matches DB varchar(20))

**Rationale**: Database has separate `users` and `user_profiles` tables. Validation schemas should reflect this separation for clarity and proper data flow.

### 2. Comment Schema Field Name Alignment

**File**: `shared/validation/schemas/comment.schema.ts`

**Changes**:
- Renamed `content` → `comment_text` (matches DB column name)
- Renamed `author_id` → `user_id` (matches DB column name)
- Renamed `parent_id` → `parent_comment_id` (matches DB column name)
- Made `bill_id` required (matches DB NOT NULL constraint)
- Removed `argument_id` (not in database)
- Removed `is_edited` (not in database, can be derived from updated_at)
- Created `LegacyCommentSchema` for backward compatibility

**Rationale**: Field names must match database column names exactly to prevent confusion and mapping errors. Required fields in validation must match NOT NULL constraints in database.

### 3. Bill Schema Constraint Alignment

**File**: `shared/validation/schemas/bill.schema.ts`

**Changes**:
- Updated `title` max length from 200 to 500 chars (matches DB varchar(500))
- Made `summary` optional (matches DB NULL allowed)
- Renamed `content` → `full_text` and made optional (matches DB column name and NULL allowed)
- Made `bill_number` required (matches DB NOT NULL constraint)
- Made `chamber` required (matches DB NOT NULL constraint)
- Updated `status` enum values to match database enum
- Changed default status from 'draft' to 'first_reading' (matches DB default)
- Updated `chamber` enum values to match database ('national_assembly', 'senate', 'joint')
- Removed `type` field (not in database)
- Removed `priority` field (not in database)
- Created `LegacyBillSchema` for backward compatibility

**Rationale**: Validation constraints must match database constraints to prevent validation passing but database insert failing.

### 4. Documentation

**File**: `shared/validation/SCHEMA_ALIGNMENT_GUIDE.md`

**Content**:
- Complete field mapping tables for all schemas
- Migration guide for existing code
- Explanation of intentional differences
- Usage examples for new schemas
- Testing guidance

**Rationale**: Developers need clear documentation to understand the alignment and migrate existing code.

## Backward Compatibility

Legacy schemas are provided for code that hasn't been migrated yet:
- `LegacyCommentSchema`: Uses old field names (content, author_id, parent_id)
- `LegacyBillSchema`: Includes removed fields (type, priority) and old constraints

These are marked as `@deprecated` and should be migrated to new schemas over time.

## Testing

All changes pass TypeScript compilation with no diagnostics errors:
- ✅ `shared/validation/schemas/user.schema.ts`
- ✅ `shared/validation/schemas/comment.schema.ts`
- ✅ `shared/validation/schemas/bill.schema.ts`

Existing property-based tests validate alignment:
- `tests/properties/validation-at-integration-points.property.test.ts`

## Impact Analysis

### Breaking Changes

1. **Comment Schema**:
   - Field names changed: `content` → `comment_text`, `author_id` → `user_id`
   - `bill_id` now required (was optional)
   - Removed fields: `argument_id`, `is_edited`

2. **Bill Schema**:
   - Field name changed: `content` → `full_text`
   - `bill_number` now required (was optional)
   - `chamber` now required (was optional)
   - Removed fields: `type`, `priority`
   - Status enum values changed
   - Chamber enum values changed

3. **User Schema**:
   - Profile fields moved to separate `UserProfileSchema`
   - Field name changed: `phone` → `phone_number`

### Migration Path

**Option 1**: Update code to use new schemas (recommended)
```typescript
// Update field names in your code
const comment = {
  comment_text: "...",  // was: content
  user_id: userId,      // was: author_id
  bill_id: billId,      // now required
};
```

**Option 2**: Use legacy schemas temporarily
```typescript
import { LegacyCommentSchema } from '@shared/validation/schemas/comment.schema';
// Then transform to DB format before saving
```

## Deferred Work

The following require database migrations and are deferred:

1. **Add missing database fields**:
   - `users.username` (currently in validation but not in DB)
   - `bills.type` (currently in legacy validation but not in DB)
   - `bills.priority` (currently in legacy validation but not in DB)

2. **Add database constraints**:
   - Length check on `user_profiles.bio` (≤ 500 chars)
   - Length check on `comments.comment_text` (≤ 5000 chars)
   - Make `bills.summary` NOT NULL (if required)
   - Make `bills.full_text` NOT NULL (if required)

These require coordination with production data and potential data migrations.

## Benefits

1. **Consistency**: Validation and database constraints are now aligned
2. **Clarity**: Field names match database column names exactly
3. **Type Safety**: TypeScript types reflect actual database structure
4. **Error Prevention**: Validation failures match database constraint violations
5. **Documentation**: Clear mapping between validation and database
6. **Maintainability**: Single source of truth (database) for constraints

## Next Steps

1. ✅ Update validation schemas (COMPLETED)
2. ✅ Create documentation (COMPLETED)
3. ⬜ Migrate existing code to use new schemas
4. ⬜ Remove legacy schemas after migration complete
5. ⬜ Plan database migrations for missing fields/constraints
6. ⬜ Update API endpoints to use aligned schemas
7. ⬜ Update client forms to use aligned schemas

## Related Files

- Audit Report: `.kiro/specs/full-stack-integration/CONSTRAINT_VALIDATION_AUDIT.md`
- Alignment Guide: `shared/validation/SCHEMA_ALIGNMENT_GUIDE.md`
- User Schema: `shared/validation/schemas/user.schema.ts`
- Comment Schema: `shared/validation/schemas/comment.schema.ts`
- Bill Schema: `shared/validation/schemas/bill.schema.ts`
- Database Schemas: `server/infrastructure/schema/`

## Conclusion

Validation schemas are now aligned with database constraints, treating the database as the source of truth. This prevents runtime errors, improves data integrity, and provides clear documentation for developers. Legacy schemas ensure backward compatibility during migration.
