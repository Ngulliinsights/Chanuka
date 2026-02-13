# Database Type Generation System

## Overview

This directory contains auto-generated TypeScript types derived from Drizzle ORM schema definitions. The type generation system ensures that database schemas and application types remain synchronized.

## Architecture

```
Drizzle Schema (server/infrastructure/schema/)
    ↓
Type Generation Script (scripts/database/generate-types.ts)
    ↓
Generated Database Types (generated-tables.ts)
    ↓
Post-Generation Transform (scripts/database/post-generate-transform.ts)
    ↓
Generated Domain Types (generated-domains.ts)
```

## Files

### Auto-Generated Files (DO NOT EDIT MANUALLY)

- **`generated-tables.ts`**: Database table types using Drizzle's `$inferSelect` and `$inferInsert`
  - Uses snake_case naming (matches PostgreSQL conventions)
  - Directly inferred from schema definitions
  - Includes insert types for creating new records

- **`generated-domains.ts`**: Domain types for application use
  - Uses camelCase naming (matches TypeScript conventions)
  - Transformed from database types
  - Optimized for use in business logic

### Manual Files

- **`tables.ts`**: Legacy table types (will be replaced by generated types)
- **`index.ts`**: Main export file for database types

## Usage

### Generating Types

Run the type generation script after any schema changes:

```bash
npm run db:generate-types
```

This command:
1. Reads Drizzle schema definitions
2. Generates database table types using `$inferSelect`
3. Generates domain types with camelCase transformation
4. Applies branded type mappings
5. Updates index exports

### Using Generated Types

#### Database Layer (Repositories)

```typescript
import type { UserTable, UserTableInsert } from 'shared/types/database';

// Query returns database types (snake_case)
const dbUser: UserTable = await db.select().from(users).where(eq(users.id, userId));

// Insert uses insert types
const newUser: UserTableInsert = {
  email: 'user@example.com',
  password_hash: hashedPassword,
  role: 'citizen',
};
```

#### Domain Layer (Services)

```typescript
import type { User } from 'shared/types/database';
import { UserDbToDomain } from 'shared/utils/transformers';

// Transform database type to domain type
const domainUser: User = UserDbToDomain.transform(dbUser);

// Domain types use camelCase
console.log(domainUser.passwordHash); // camelCase
console.log(dbUser.password_hash);    // snake_case
```

## Type Transformation

### Database → Domain

Database types use `snake_case` to match PostgreSQL conventions:
```typescript
interface UserTable {
  id: UserId;
  email: string;
  password_hash: string;
  created_at: Date;
}
```

Domain types use `camelCase` for TypeScript conventions:
```typescript
interface User {
  id: UserId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}
```

### Branded Types

Entity identifiers use branded types for type safety:
```typescript
type UserId = string & { readonly __brand: 'UserId' };
type BillId = string & { readonly __brand: 'BillId' };

// This prevents mixing different ID types
function getUser(id: UserId) { ... }
function getBill(id: BillId) { ... }

const userId: UserId = '123' as UserId;
const billId: BillId = '456' as BillId;

getUser(userId);  // ✓ OK
getUser(billId);  // ✗ Type error - cannot use BillId as UserId
```

## Integration with Migrations

### Workflow

1. **Modify Schema**: Update Drizzle schema files in `server/infrastructure/schema/`
2. **Generate Migration**: Run `npm run db:generate` to create migration
3. **Generate Types**: Run `npm run db:generate-types` to update types
4. **Verify Alignment**: Run `npm run db:verify-schema-alignment` to check consistency
5. **Apply Migration**: Run `npm run db:migrate` to apply changes

### Automated Type Generation

The type generation can be integrated into the migration workflow:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate && npm run db:generate-types"
  }
}
```

## Type Safety Guarantees

### Compile-Time Safety

- **Schema Changes**: Type errors appear immediately when schema changes break code
- **Field Renames**: Renaming a database column causes type errors in all usages
- **Type Mismatches**: Cannot assign incompatible types to database fields

### Runtime Safety

- **Validation**: Zod schemas validate data at runtime (see `shared/validation/`)
- **Transformation**: Transformers ensure data integrity during conversions
- **Branded Types**: Prevent mixing of similar primitive types

## Best Practices

### DO

✓ Run `db:generate-types` after every schema change
✓ Use generated types in repositories and data access layers
✓ Transform to domain types at the boundary between database and business logic
✓ Use branded types for entity identifiers
✓ Verify type alignment before deploying migrations

### DON'T

✗ Edit generated files manually (they will be overwritten)
✗ Mix database types and domain types in the same layer
✗ Use raw strings for entity IDs (use branded types)
✗ Skip type generation after schema changes
✗ Deploy migrations without verifying type alignment

## Troubleshooting

### Types Out of Sync

If types don't match the database schema:

```bash
# Regenerate types
npm run db:generate-types

# Verify alignment
npm run db:verify-schema-alignment
```

### Missing Types

If a table is missing from generated types:

1. Check that the table is exported in the schema file
2. Check that the schema file is listed in `drizzle.config.ts`
3. Regenerate types: `npm run db:generate-types`

### Type Errors After Migration

If type errors appear after applying a migration:

1. Regenerate types: `npm run db:generate-types`
2. Update transformers in `shared/utils/transformers/`
3. Update validation schemas in `shared/validation/`
4. Fix code that uses the changed types

## Related Documentation

- [Schema Definitions](../../../server/infrastructure/schema/README.md)
- [Migration Guide](../../../scripts/database/README.md)
- [Type System](../README.md)
- [Validation Schemas](../../validation/README.md)

## Requirements

This type generation system satisfies:
- **Requirement 1.2**: Database schema changes automatically generate TypeScript types
- **Requirement 2.1**: Migrations create corresponding TypeScript types automatically
