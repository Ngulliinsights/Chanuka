# Database Constraint & Validation Schema Alignment Recommendations

**Task**: 7.4 Align database constraints with validation schemas  
**Date**: 2026-02-12  
**Status**: Recommendations Ready for Review

## Executive Summary

After auditing database constraints and validation schemas across the Chanuka Platform, we identified **23 misalignments** across 4 core entities (users, user_profiles, bills, comments). This document provides prioritized recommendations to achieve alignment.

## Alignment Philosophy

**Principle**: Database constraints are the ultimate source of truth for data integrity. Validation schemas should mirror database constraints to provide early feedback to users while ensuring the database remains the final arbiter.

**Strategy**: 
1. Fix critical misalignments that could cause runtime errors
2. Add missing database constraints to enforce validation rules
3. Update validation schemas to match database reality
4. Document intentional differences

## Priority 1: Critical Fixes (Prevent Runtime Errors)

### 1.1 Bills Table - Required Fields Mismatch

**Problem**: Validation requires fields that DB allows as NULL, or vice versa.

**Impact**: 
- Validation passes → DB insert fails (bad UX)
- DB allows NULL → Application expects value (runtime errors)

**Solution**:

```typescript
// Option A: Make DB match validation (RECOMMENDED)
// Migration: Add NOT NULL constraints
ALTER TABLE bills 
  ALTER COLUMN summary SET NOT NULL,
  ALTER COLUMN full_text SET NOT NULL;

// Option B: Make validation match DB
// Update shared/validation/schemas/bill.schema.ts
export const BillSchema = z.object({
  // ... other fields
  summary: z.string().min(20).max(1000).optional(), // Allow NULL
  content: z.string().min(50).max(100000).optional(), // Allow NULL
  bill_number: z.string().regex(BILL_NUMBER_PATTERN), // Make required
  chamber: z.enum(['house', 'senate', 'joint']), // Make required
});
```

**Recommendation**: **Option A** - Make DB match validation. Bills should always have summary and content.

### 1.2 Comments Table - Field Name Mismatches

**Problem**: Database uses different field names than validation schema.

**Impact**: 
- Transformation layer must map field names
- Increased complexity and potential for bugs
- Confusion for developers

**Current Mapping**:
- DB: `comment_text` ↔ Validation: `content`
- DB: `user_id` ↔ Validation: `author_id`
- DB: `parent_comment_id` ↔ Validation: `parent_id`

**Solution**:

```typescript
// Option A: Update validation to match DB (RECOMMENDED)
// Update shared/validation/schemas/comment.schema.ts
export const CommentSchema = z.object({
  id: z.string().uuid().optional(),
  comment_text: z.string().min(5).max(5000), // Was: content
  user_id: z.string().uuid(), // Was: author_id
  bill_id: z.string().uuid(), // Make required to match DB
  parent_comment_id: z.string().uuid().optional().nullable(), // Was: parent_id
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Option B: Rename DB columns (NOT RECOMMENDED - breaking change)
ALTER TABLE comments 
  RENAME COLUMN comment_text TO content,
  RENAME COLUMN user_id TO author_id,
  RENAME COLUMN parent_comment_id TO parent_id;
```

**Recommendation**: **Option A** - Update validation to match DB. Avoid renaming DB columns.

### 1.3 Users Table - Missing Username Field

**Problem**: Validation requires `username` field that doesn't exist in database.

**Impact**: Cannot save validated user data to database.

**Solution**:

```sql
-- Add username column to users table
ALTER TABLE users 
  ADD COLUMN username VARCHAR(100) UNIQUE NOT NULL;

-- Create index for username lookups
CREATE INDEX idx_users_username ON users(username) 
  WHERE is_active = true;
```

**Recommendation**: Add `username` column to database. This is a core user identifier.

## Priority 2: Add Missing Database Constraints

### 2.1 Length Constraints

**Problem**: Validation limits string lengths, but database has no corresponding constraints.

**Impact**: Database could accept data that validation would reject, leading to inconsistency.

**Solution**:

```sql
-- User profiles
ALTER TABLE user_profiles 
  ADD CONSTRAINT first_name_length_check 
    CHECK (LENGTH(first_name) <= 50 OR first_name IS NULL),
  ADD CONSTRAINT last_name_length_check 
    CHECK (LENGTH(last_name) <= 50 OR last_name IS NULL),
  ADD CONSTRAINT bio_length_check 
    CHECK (LENGTH(bio) <= 500 OR bio IS NULL);

-- Comments
ALTER TABLE comments 
  ADD CONSTRAINT comment_text_length_check 
    CHECK (LENGTH(comment_text) <= 5000);

-- Bills
ALTER TABLE bills 
  ADD CONSTRAINT title_length_check 
    CHECK (LENGTH(title) <= 200);
```

**Recommendation**: Add all length constraints to match validation rules.

### 2.2 Missing Fields in Database

**Problem**: Validation schemas reference fields that don't exist in database.

**Fields**:
- Bills: `type`, `priority`
- Comments: `argument_id`, `is_edited`

**Solution**:

```sql
-- Option A: Add fields to database (if they're needed)
ALTER TABLE bills 
  ADD COLUMN type VARCHAR(50) DEFAULT 'bill',
  ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';

ALTER TABLE comments 
  ADD COLUMN argument_id UUID REFERENCES arguments(id),
  ADD COLUMN is_edited BOOLEAN DEFAULT false;

-- Option B: Remove from validation (if they're not needed)
-- Update validation schemas to remove these fields
```

**Recommendation**: **Investigate usage** - If these fields are used in the application, add to DB. If not, remove from validation.

## Priority 3: Update Validation Schemas

### 3.1 Split User Validation Schema

**Problem**: UserSchema combines fields from `users` and `user_profiles` tables.

**Impact**: Confusion about which table fields belong to, difficult to validate partial updates.

**Solution**:

```typescript
// shared/validation/schemas/user.schema.ts

// Core user authentication fields (users table)
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().regex(EMAIL_PATTERN),
  username: z.string().regex(USERNAME_PATTERN),
  role: z.enum(['citizen', 'representative', 'admin']).default('citizen'),
  is_active: z.boolean().default(true),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// User profile fields (user_profiles table)
export const UserProfileSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  phone_number: z.string().regex(PHONE_PATTERN).optional().nullable(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Combined schema for full user data
export const FullUserSchema = UserSchema.merge(
  UserProfileSchema.omit({ id: true, user_id: true, created_at: true, updated_at: true })
);
```

**Recommendation**: Split schemas to match database structure. Use combined schema for API responses.

### 3.2 Align Enum Values

**Problem**: Enum values in validation may not match database enum definitions.

**Solution**:

```typescript
// Generate validation enums from database enums
// shared/validation/schemas/enums.ts

// Import from database schema
import { 
  userRoleEnum, 
  billStatusEnum, 
  chamberEnum 
} from '@server/infrastructure/schema/enum';

// Create Zod enums that match database
export const UserRoleEnum = z.enum(['citizen', 'representative', 'admin']);
export const BillStatusEnum = z.enum([
  'first_reading',
  'second_reading',
  'committee_review',
  // ... all status values from DB
]);
export const ChamberEnum = z.enum(['house', 'senate', 'joint']);
```

**Recommendation**: Generate validation enums from database enum definitions to ensure they stay in sync.

## Priority 4: Documentation

### 4.1 Document Intentional Differences

**Create**: `docs/database-validation-alignment.md`

**Content**:
```markdown
# Database and Validation Alignment Guide

## Intentional Differences

### Generated Fields
- `id`, `created_at`, `updated_at`: Optional in validation (generated by DB)

### Internal Fields
- `failed_login_attempts`, `completeness_score`, `profile_views`: Not in validation (internal metrics)

### Security Fields
- `password_hash`: In DB only, `password`: In registration validation only

## Field Mappings

### Comments
| Validation Field | Database Field | Notes |
|------------------|----------------|-------|
| content | comment_text | Historical naming |
| author_id | user_id | Semantic clarity |
| parent_id | parent_comment_id | Brevity |

### Users
| Validation Field | Database Field | Notes |
|------------------|----------------|-------|
| Combined schema | users + user_profiles | API convenience |
```

### 4.2 Add Schema Comments

**Add to database schemas**:

```typescript
export const bills = pgTable("bills", {
  // ... fields
  
  // VALIDATION ALIGNMENT: summary is required in BillSchema (min: 20, max: 1000)
  summary: text("summary").notNull(),
  
  // VALIDATION ALIGNMENT: content/full_text is required in BillSchema (min: 50, max: 100000)
  full_text: text("full_text").notNull(),
});
```

**Add to validation schemas**:

```typescript
// VALIDATION ALIGNMENT: Matches bills.summary in database (NOT NULL, text)
summary: z.string().min(20).max(1000),
```

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ Complete audit document
2. ⬜ Add `username` column to users table
3. ⬜ Update CommentSchema field names
4. ⬜ Make bills.summary and bills.full_text NOT NULL
5. ⬜ Update BillSchema to make bill_number and chamber required

### Phase 2: Add Constraints (Week 2)
1. ⬜ Add length constraints to user_profiles
2. ⬜ Add length constraint to comments
3. ⬜ Add length constraint to bills.title
4. ⬜ Investigate and add/remove type and priority fields

### Phase 3: Refactor Validation (Week 3)
1. ⬜ Split UserSchema into UserSchema and UserProfileSchema
2. ⬜ Generate enum validation from database enums
3. ⬜ Create automated alignment tests

### Phase 4: Documentation (Week 4)
1. ⬜ Document intentional differences
2. ⬜ Add schema comments
3. ⬜ Create field mapping guide
4. ⬜ Write migration guide for developers

## Automated Alignment Testing

**Create**: `tests/integration/schema-validation-alignment.test.ts`

```typescript
describe('Schema-Validation Alignment', () => {
  it('should have matching required fields', async () => {
    // Get DB schema
    const dbSchema = await getDatabaseSchema('users');
    
    // Get validation schema
    const validationSchema = UserSchema;
    
    // Compare required fields
    const dbRequired = dbSchema.fields.filter(f => f.notNull);
    const validationRequired = getRequiredFields(validationSchema);
    
    expect(validationRequired).toEqual(dbRequired);
  });
  
  it('should have matching length constraints', async () => {
    // Compare varchar lengths with validation max lengths
    // ...
  });
  
  it('should have matching enum values', async () => {
    // Compare DB enum values with validation enum values
    // ...
  });
});
```

## Success Criteria

- ✅ All critical misalignments resolved
- ✅ Database constraints match validation rules
- ✅ Validation schemas match database structure
- ✅ Automated tests verify alignment
- ✅ Documentation explains intentional differences
- ✅ Zero runtime errors due to constraint mismatches

## Conclusion

Achieving alignment between database constraints and validation schemas is critical for data integrity and developer experience. The recommended approach prioritizes:

1. **Database as source of truth**: Add constraints to DB first
2. **Validation as early feedback**: Update validation to match DB
3. **Documentation**: Explain intentional differences
4. **Automation**: Test alignment continuously

**Estimated Effort**: 4 weeks (1 developer)  
**Risk**: Low (mostly additive changes)  
**Impact**: High (prevents data integrity issues)

