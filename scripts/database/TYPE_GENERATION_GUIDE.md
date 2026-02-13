# Database Type Generation System - Implementation Guide

## Overview

This guide documents the automated type generation system that ensures database schemas and TypeScript types remain synchronized. This system satisfies Requirements 1.2 and 2.1 from the Full-Stack Integration specification.

## Architecture

### Components

1. **Type Generation Script** (`generate-types-simple.ts`)
   - Scans Drizzle schema files for table definitions
   - Generates TypeScript types using Drizzle's `$inferSelect` and `$inferInsert`
   - Outputs to `shared/types/database/generated-tables.ts`

2. **Post-Generation Transform** (`post-generate-transform.ts`)
   - Applies branded type transformations
   - Updates index files with new exports
   - Generates transformation utility templates

3. **Migration Integration** (`generate-migration-with-types.ts`)
   - Generates Drizzle migrations
   - Automatically runs type generation
   - Verifies type alignment

### Data Flow

```
Schema Change
    ↓
Generate Migration (drizzle-kit generate)
    ↓
Generate Types (db:generate-types)
    ├─→ Scan schema files
    ├─→ Extract table definitions
    ├─→ Generate types using $inferSelect/$inferInsert
    └─→ Write to generated-tables.ts
    ↓
Post-Generation Transform
    ├─→ Apply branded type mappings
    ├─→ Update index exports
    └─→ Generate transformer templates
    ↓
Verify Alignment (db:verify-schema-alignment)
    ↓
Apply Migration (db:migrate)
```

## Usage

### Basic Type Generation

After modifying schema files, regenerate types:

```bash
npm run db:generate-types
```

This command:
1. Scans all schema files in `server/infrastructure/schema/`
2. Extracts exported `pgTable` declarations
3. Generates types using Drizzle's type inference
4. Runs post-generation transformations
5. Updates exports in `shared/types/database/index.ts`

### Integrated Migration + Type Generation

When creating a new migration:

```bash
npm run db:generate-with-types -- --name "add_user_preferences"
```

This command:
1. Generates a Drizzle migration
2. Automatically generates types
3. Verifies type alignment
4. Provides next steps

### Manual Workflow

For more control:

```bash
# 1. Generate migration
npm run db:generate -- --name "migration_name"

# 2. Generate types
npm run db:generate-types

# 3. Verify alignment
npm run db:verify-schema-alignment

# 4. Apply migration
npm run db:migrate
```

## Generated Types

### Database Table Types

Each table gets two generated types:

```typescript
// Full row type (from $inferSelect)
export type UsersTable = typeof schema.users.$inferSelect;

// Insert type (from $inferInsert, omits auto-generated fields)
export type UsersTableInsert = typeof schema.users.$inferInsert;
```

### Usage Examples

#### In Repositories (Database Layer)

```typescript
import type { UsersTable, UsersTableInsert } from 'shared/types/database';
import { users } from 'server/infrastructure/schema';
import { db } from 'server/infrastructure/database';

// Query returns database types
async function getUserById(id: string): Promise<UsersTable | null> {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

// Insert uses insert types
async function createUser(data: UsersTableInsert): Promise<UsersTable> {
  const result = await db.insert(users).values(data).returning();
  return result[0];
}
```

#### In Services (Domain Layer)

```typescript
import type { User } from 'shared/types/domains';
import type { UsersTable } from 'shared/types/database';
import { UserDbToDomain } from 'shared/utils/transformers';

// Transform database type to domain type
function toDomain(dbUser: UsersTable): User {
  return UserDbToDomain.transform(dbUser);
}
```

## Type Safety Benefits

### 1. Compile-Time Schema Validation

When you change a schema:

```typescript
// Before: users table has 'username' field
const user = await db.select().from(users);
console.log(user.username); // ✓ OK

// After: rename 'username' to 'display_name' in schema
npm run db:generate-types

// Now this causes a compile error:
console.log(user.username); // ✗ Type error: Property 'username' does not exist
console.log(user.display_name); // ✓ OK
```

### 2. Automatic Field Type Updates

```typescript
// Before: age is number
const user: UsersTable = { age: 25, ... };

// After: change age to string in schema
npm run db:generate-types

// Now this causes a compile error:
const user: UsersTable = { age: 25, ... }; // ✗ Type error: number not assignable to string
const user: UsersTable = { age: "25", ... }; // ✓ OK
```

### 3. Insert Type Safety

```typescript
// Insert type omits auto-generated fields
const newUser: UsersTableInsert = {
  email: 'user@example.com',
  password_hash: 'hashed',
  // id, created_at, updated_at are omitted automatically
};

await db.insert(users).values(newUser);
```

## Integration with Migrations

### Pre-Migration Checklist

Before applying a migration:

1. ✓ Schema changes are complete
2. ✓ Types are generated (`npm run db:generate-types`)
3. ✓ Type alignment is verified (`npm run db:verify-schema-alignment`)
4. ✓ Transformers are updated (if needed)
5. ✓ Validation schemas are updated (if needed)
6. ✓ Tests pass

### Post-Migration Checklist

After applying a migration:

1. ✓ Migration applied successfully
2. ✓ Types are still aligned
3. ✓ Application compiles without errors
4. ✓ Tests pass
5. ✓ Integration tests verify data flow

## Configuration

### Schema Files

Schema files are configured in `drizzle.config.ts`:

```typescript
export default defineConfig({
  schema: [
    "./server/infrastructure/schema/foundation.ts",
    "./server/infrastructure/schema/citizen_participation.ts",
    "./server/infrastructure/schema/parliamentary_process.ts",
    "./server/infrastructure/schema/safeguards.ts",
    "./server/infrastructure/schema/enum.ts"
  ],
  // ...
});
```

### Output Directory

Generated types are written to:
- `shared/types/database/generated-tables.ts` - Database types
- `shared/types/database/generated-domains.ts` - Domain types (future)

### Type Generation Script

The script scans schema files and extracts table definitions:

```typescript
// Finds all exported pgTable declarations
const tableMatches = content.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\(/g);
```

## Troubleshooting

### Types Not Generated

**Problem**: Running `db:generate-types` doesn't create types for a table.

**Solutions**:
1. Ensure the table is exported: `export const users = pgTable(...)`
2. Ensure the schema file is listed in `drizzle.config.ts`
3. Check for syntax errors in the schema file
4. Run with verbose output to see which files are scanned

### Type Mismatches

**Problem**: Generated types don't match database schema.

**Solutions**:
1. Regenerate types: `npm run db:generate-types`
2. Verify schema file is correct
3. Check that migration was applied: `npm run db:migrate`
4. Run alignment verification: `npm run db:verify-schema-alignment`

### Import Errors

**Problem**: Cannot import generated types.

**Solutions**:
1. Check that `shared/types/database/index.ts` exports generated types
2. Verify the generated file exists: `shared/types/database/generated-tables.ts`
3. Restart TypeScript server in your IDE
4. Check for circular dependencies

### Branded Type Issues

**Problem**: Branded types (UserId, BillId) not working correctly.

**Solutions**:
1. Ensure branded types are defined in `shared/types/core/branded.ts`
2. Import branded types from the correct location
3. Use type assertions when creating branded types: `'123' as UserId`
4. Check that the post-generation transform ran successfully

## Best Practices

### DO

✓ Run `db:generate-types` after every schema change
✓ Use `db:generate-with-types` for integrated workflow
✓ Verify type alignment before deploying migrations
✓ Use generated types in repositories and data access layers
✓ Transform to domain types at layer boundaries
✓ Commit generated types to version control

### DON'T

✗ Edit generated files manually (they will be overwritten)
✗ Skip type generation after schema changes
✗ Deploy migrations without regenerating types
✗ Mix database types and domain types in the same layer
✗ Ignore type errors after regeneration

## Future Enhancements

### Planned Features

1. **Domain Type Generation** (Task 5.1)
   - Generate camelCase domain types from snake_case database types
   - Automatic transformation utilities

2. **Validation Schema Generation** (Task 7.1)
   - Generate Zod schemas from database types
   - Ensure validation aligns with database constraints

3. **API Contract Generation** (Task 4.1)
   - Generate API request/response types from domain types
   - Ensure API contracts align with database schema

4. **Migration Verification** (Task 10.1)
   - Automated verification that migrations preserve type alignment
   - Pre-migration checks to prevent breaking changes

## Related Documentation

- [Full-Stack Integration Spec](.kiro/specs/full-stack-integration/design.md)
- [Database Schema Guide](../../server/infrastructure/schema/README.md)
- [Type System Overview](../../shared/types/README.md)
- [Migration Guide](./README.md)

## Requirements Satisfied

This type generation system satisfies:

- **Requirement 1.2**: Database schema changes automatically generate TypeScript types
- **Requirement 2.1**: Migrations create corresponding TypeScript types automatically

The system ensures that database schemas and application types remain synchronized, preventing schema drift and catching type errors at compile time.
