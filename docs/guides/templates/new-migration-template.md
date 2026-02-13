# Template: New Database Migration

## Overview

Use this template when creating database schema changes. This template ensures migrations preserve type alignment and integration integrity.

**Replace placeholders:**
- `{migration_name}` - Descriptive migration name in snake_case (e.g., `add_user_bio_field`, `create_votes_table`)
- `{table_name}` - Table name in snake_case (e.g., `users`, `bills`, `votes`)
- `{Entity}` - Entity name in PascalCase (e.g., `User`, `Bill`, `Vote`)
- `{entity}` - Entity name in camelCase (e.g., `user`, `bill`, `vote`)
- `{field_name}` - Field name in snake_case (e.g., `bio`, `vote_count`, `status`)
- `{fieldName}` - Field name in camelCase (e.g., `bio`, `voteCount`, `status`)

## Migration Types

Choose the appropriate section based on your migration type:
1. [Adding a New Table](#type-1-adding-a-new-table)
2. [Adding a Column](#type-2-adding-a-column)
3. [Modifying a Column](#type-3-modifying-a-column)
4. [Removing a Column](#type-4-removing-a-column)
5. [Adding an Index](#type-5-adding-an-index)
6. [Adding a Constraint](#type-6-adding-a-constraint)

---

## General Checklist

- [ ] Step 1: Generate migration file
- [ ] Step 2: Update database schema definition
- [ ] Step 3: Update domain types
- [ ] Step 4: Update validation schemas
- [ ] Step 5: Update transformers
- [ ] Step 6: Update API contracts (if needed)
- [ ] Step 7: Update service layer (if needed)
- [ ] Step 8: Run migration verification
- [ ] Step 9: Test migration
- [ ] Step 10: Test rollback

---

## Type 1: Adding a New Table

### Step 1: Generate Migration

```bash
npm run db:generate
# Enter migration name: create_{table_name}_table
```

### Step 2: Update Database Schema

**File**: `server/infrastructure/schema/{table_name}.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, text, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// Import related tables
// import { users } from './foundation';

export const {table_name} = pgTable('{table_name}', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Add columns
  // Example: name: varchar('name', { length: 255 }).notNull(),
  // Example: description: text('description'),
  // Example: count: integer('count').notNull().default(0),
  // Example: is_active: boolean('is_active').notNull().default(true),
  
  // Foreign keys
  // Example: user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Timestamps
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Add constraints
  // Example: unique().on(table.user_id, table.bill_id),
}));

// Inferred types
export type {Entity}Table = typeof {table_name}.$inferSelect;
export type New{Entity} = typeof {table_name}.$inferInsert;

// Define relations
export const {table_name}Relations = relations({table_name}, ({ one, many }) => ({
  // Example: user: one(users, { fields: [{table_name}.user_id], references: [users.id] }),
  // Example: comments: many(comments),
}));
```

**Export from schema index**:

**File**: `server/infrastructure/schema/index.ts`

```typescript
export * from './{table_name}';
```

### Step 3: Follow "New Entity Template"

For complete integration, follow the [New Entity Template](./new-entity-template.md) starting from Step 2.

---

## Type 2: Adding a Column

### Step 1: Generate Migration

```bash
npm run db:generate
# Enter migration name: add_{field_name}_to_{table_name}
```

### Step 2: Update Database Schema

**File**: `server/infrastructure/schema/{table_name}.ts`

```typescript
export const {table_name} = pgTable('{table_name}', {
  // ... existing columns
  
  // Add new column
  {field_name}: /* column type */('{field_name}', /* options */),
  // Examples:
  // bio: text('bio'),
  // vote_count: integer('vote_count').notNull().default(0),
  // status: varchar('status', { length: 50 }).notNull().default('active'),
  // is_verified: boolean('is_verified').notNull().default(false),
  // metadata: jsonb('metadata'),
  
  // ... existing timestamps
});
```

**Column Types:**
- `varchar(name, { length })` - Variable-length string
- `text(name)` - Unlimited text
- `integer(name)` - Integer number
- `real(name)` - Floating point
- `boolean(name)` - True/false
- `timestamp(name)` - Date and time
- `date(name)` - Date only
- `jsonb(name)` - JSON data
- `uuid(name)` - UUID

**Column Options:**
- `.notNull()` - Cannot be null
- `.default(value)` - Default value
- `.unique()` - Must be unique
- `.references(() => table.column)` - Foreign key

### Step 3: Update Domain Type

**File**: `shared/types/domains/{entity}.ts`

```typescript
export interface {Entity} {
  // ... existing fields
  
  // Add new field
  {fieldName}: /* TypeScript type */;
  // Examples:
  // bio: string | null;
  // voteCount: number;
  // status: {Entity}Status;
  // isVerified: boolean;
  // metadata: Record<string, unknown> | null;
  
  // ... existing timestamps
}
```

### Step 4: Update Validation Schema

**File**: `shared/validation/schemas/{entity}.schema.ts`

```typescript
export const {Entity}Schema = z.object({
  // ... existing fields
  
  // Add new field validation
  {fieldName}: /* Zod schema */,
  // Examples:
  // bio: z.string().max(1000).nullable(),
  // voteCount: z.number().int().min(0),
  // status: z.enum(['active', 'inactive', 'pending']),
  // isVerified: z.boolean(),
  // metadata: z.record(z.unknown()).nullable(),
  
  // ... existing timestamps
});

// Update request schemas if field should be settable
export const Create{Entity}RequestSchema = z.object({
  // ... existing fields
  {fieldName}: /* Zod schema */.optional(),
});

export const Update{Entity}RequestSchema = z.object({
  // ... existing fields
  {fieldName}: /* Zod schema */.optional(),
});
```

### Step 5: Update Transformer

**File**: `shared/utils/transformers/{entity}.transformer.ts`

```typescript
export const {Entity}DbToDomain = {
  transform(db{Entity}: {Entity}Table): {Entity} {
    return {
      // ... existing fields
      
      // Add new field transformation
      {fieldName}: db{Entity}.{field_name},
      // Examples with type conversion:
      // bio: db{Entity}.bio ?? null,
      // voteCount: db{Entity}.vote_count,
      // status: db{Entity}.status as {Entity}Status,
      // isVerified: db{Entity}.is_verified,
      // metadata: db{Entity}.metadata ?? null,
      
      // ... existing timestamps
    };
  },
  
  reverse({entity}: {Entity}): Omit<{Entity}Table, 'created_at' | 'updated_at'> {
    return {
      // ... existing fields
      
      // Add new field reverse transformation
      {field_name}: {entity}.{fieldName},
      // Examples:
      // bio: {entity}.bio,
      // vote_count: {entity}.voteCount,
      // status: {entity}.status,
      // is_verified: {entity}.isVerified,
      // metadata: {entity}.metadata,
      
      // ... existing fields
    };
  },
};
```

### Step 6: Update API Contracts (if needed)

**File**: `shared/types/api/contracts/{entity}.contract.ts`

```typescript
// If the new field should be exposed in API requests
export interface Create{Entity}Request {
  // ... existing fields
  {fieldName}?: /* TypeScript type */;
}

export interface Update{Entity}Request {
  // ... existing fields
  {fieldName}?: /* TypeScript type */;
}

// Response types automatically include the field through {Entity} type
```

### Step 7: Update Service Layer (if needed)

**File**: `server/services/{entity}.service.ts`

```typescript
// Add business logic for the new field if needed
// Example: Validation, calculation, or transformation

async create{Entity}(data: Create{Entity}Request): Promise<{Entity}> {
  // Add logic for new field
  // Example: Validate field value
  // Example: Calculate derived value
  // Example: Set default based on business rules
  
  return this.{entity}Repository.create({
    // ... existing fields
    {field_name}: data.{fieldName} ?? /* default value */,
  });
}
```

---

## Type 3: Modifying a Column

### Step 1: Generate Migration

```bash
npm run db:generate
# Enter migration name: modify_{field_name}_in_{table_name}
```

### Step 2: Edit Migration SQL (if needed)

**File**: `drizzle/migrations/XXXXXX_modify_{field_name}_in_{table_name}.sql`

```sql
-- Change column type
ALTER TABLE {table_name} ALTER COLUMN {field_name} TYPE /* new type */;

-- Change nullability
ALTER TABLE {table_name} ALTER COLUMN {field_name} SET NOT NULL;
-- OR
ALTER TABLE {table_name} ALTER COLUMN {field_name} DROP NOT NULL;

-- Change default value
ALTER TABLE {table_name} ALTER COLUMN {field_name} SET DEFAULT /* value */;
-- OR
ALTER TABLE {table_name} ALTER COLUMN {field_name} DROP DEFAULT;

-- Add constraint
ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} CHECK (/* condition */);

-- Example: Ensure positive values
ALTER TABLE {table_name} ADD CONSTRAINT {field_name}_positive CHECK ({field_name} >= 0);
```

### Step 3: Update Schema, Types, and Transformers

Follow Steps 2-5 from "Adding a Column" to update:
- Database schema definition
- Domain types
- Validation schemas
- Transformers

---

## Type 4: Removing a Column

### Step 1: Remove Dependencies First

Before removing a column, ensure:
- [ ] No code references the field
- [ ] No API contracts expose the field
- [ ] No validation rules check the field
- [ ] No transformers use the field

### Step 2: Generate Migration

```bash
npm run db:generate
# Enter migration name: remove_{field_name}_from_{table_name}
```

### Step 3: Update Database Schema

**File**: `server/infrastructure/schema/{table_name}.ts`

```typescript
export const {table_name} = pgTable('{table_name}', {
  // ... existing columns
  
  // REMOVE the column definition
  // {field_name}: ...,
  
  // ... remaining columns
});
```

### Step 4: Update Domain Type

**File**: `shared/types/domains/{entity}.ts`

```typescript
export interface {Entity} {
  // ... existing fields
  
  // REMOVE the field
  // {fieldName}: ...;
  
  // ... remaining fields
}
```

### Step 5: Update Validation, Transformers, and Contracts

Remove the field from:
- Validation schemas (`shared/validation/schemas/{entity}.schema.ts`)
- Transformers (`shared/utils/transformers/{entity}.transformer.ts`)
- API contracts (`shared/types/api/contracts/{entity}.contract.ts`)

---

## Type 5: Adding an Index

### Step 1: Generate Migration

```bash
npm run db:generate
# Enter migration name: add_index_on_{table_name}_{field_name}
```

### Step 2: Edit Migration SQL

**File**: `drizzle/migrations/XXXXXX_add_index_on_{table_name}_{field_name}.sql`

```sql
-- Single column index
CREATE INDEX idx_{table_name}_{field_name} ON {table_name}({field_name});

-- Multi-column index
CREATE INDEX idx_{table_name}_{field1}_{field2} ON {table_name}({field1}, {field2});

-- Unique index
CREATE UNIQUE INDEX idx_{table_name}_{field_name}_unique ON {table_name}({field_name});

-- Partial index (with condition)
CREATE INDEX idx_{table_name}_{field_name}_active 
ON {table_name}({field_name}) 
WHERE status = 'active';

-- Text search index
CREATE INDEX idx_{table_name}_{field_name}_text 
ON {table_name} USING gin(to_tsvector('english', {field_name}));
```

### Step 3: Update Schema Definition (Optional)

**File**: `server/infrastructure/schema/{table_name}.ts`

```typescript
import { index } from 'drizzle-orm/pg-core';

export const {table_name} = pgTable('{table_name}', {
  // ... columns
}, (table) => ({
  // Add index definition
  {field_name}Idx: index('idx_{table_name}_{field_name}').on(table.{field_name}),
}));
```

---

## Type 6: Adding a Constraint

### Step 1: Generate Migration

```bash
npm run db:generate
# Enter migration name: add_{constraint_type}_constraint_to_{table_name}
```

### Step 2: Edit Migration SQL

**File**: `drizzle/migrations/XXXXXX_add_{constraint_type}_constraint_to_{table_name}.sql`

```sql
-- Check constraint
ALTER TABLE {table_name} 
ADD CONSTRAINT {constraint_name} 
CHECK (/* condition */);

-- Examples:
-- Positive values
ALTER TABLE bills ADD CONSTRAINT vote_count_positive CHECK (vote_count >= 0);

-- Date range
ALTER TABLE events ADD CONSTRAINT valid_date_range CHECK (end_date >= start_date);

-- Enum values
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'moderator'));

-- Unique constraint
ALTER TABLE {table_name} 
ADD CONSTRAINT {constraint_name} 
UNIQUE ({field1}, {field2});

-- Foreign key constraint
ALTER TABLE {table_name} 
ADD CONSTRAINT {constraint_name} 
FOREIGN KEY ({field_name}) 
REFERENCES {other_table}(id) 
ON DELETE CASCADE;
```

### Step 3: Update Schema Definition

**File**: `server/infrastructure/schema/{table_name}.ts`

```typescript
export const {table_name} = pgTable('{table_name}', {
  // ... columns with constraints
  {field_name}: integer('{field_name}').notNull().default(0),
}, (table) => ({
  // Add constraint
  {constraint_name}: check('{constraint_name}', sql`${table.{field_name}} >= 0`),
  // OR for unique constraint
  {constraint_name}: unique().on(table.{field1}, table.{field2}),
}));
```

---

## Step 8: Run Migration Verification

```bash
# Run type alignment verification
npm run verify:types

# Check for breaking changes
npm run verify:migration
```

**Manual verification checklist:**
- [ ] All domain types match database schema
- [ ] All transformers handle new/modified fields
- [ ] All validation schemas align with constraints
- [ ] No circular dependencies introduced
- [ ] API contracts remain backward compatible

---

## Step 9: Test Migration

### Apply Migration

```bash
# Apply to development database
npm run db:migrate

# Verify migration was applied
npm run db:studio
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific entity tests
npm test {entity}

# Run integration tests
npm test:integration
```

### Manual Testing

1. **Create test data:**
   ```sql
   INSERT INTO {table_name} (/* fields */) VALUES (/* values */);
   ```

2. **Verify data integrity:**
   ```sql
   SELECT * FROM {table_name} WHERE /* condition */;
   ```

3. **Test constraints:**
   ```sql
   -- Should fail if constraint is working
   INSERT INTO {table_name} (/* fields */) VALUES (/* invalid values */);
   ```

---

## Step 10: Test Rollback

### Create Rollback Migration

**File**: `drizzle/migrations/XXXXXX_rollback_{migration_name}.sql`

```sql
-- Reverse the changes from the original migration

-- For added column:
ALTER TABLE {table_name} DROP COLUMN {field_name};

-- For modified column:
ALTER TABLE {table_name} ALTER COLUMN {field_name} TYPE /* original type */;

-- For added constraint:
ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name};

-- For added index:
DROP INDEX idx_{table_name}_{field_name};

-- For added table:
DROP TABLE {table_name};
```

### Test Rollback

```bash
# Apply rollback migration
npm run db:migrate

# Verify rollback
npm run db:studio

# Run tests again
npm test
```

---

## Common Migration Patterns

### Adding a Nullable Column with Data Migration

```sql
-- Step 1: Add column as nullable
ALTER TABLE {table_name} ADD COLUMN {field_name} /* type */;

-- Step 2: Populate with default values
UPDATE {table_name} SET {field_name} = /* default value */ WHERE {field_name} IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE {table_name} ALTER COLUMN {field_name} SET NOT NULL;
```

### Renaming a Column

```sql
-- Rename column
ALTER TABLE {table_name} RENAME COLUMN {old_name} TO {new_name};

-- Update comments
COMMENT ON COLUMN {table_name}.{new_name} IS '/* description */';
```

### Changing Column Type Safely

```sql
-- Step 1: Add new column
ALTER TABLE {table_name} ADD COLUMN {field_name}_new /* new type */;

-- Step 2: Copy and convert data
UPDATE {table_name} SET {field_name}_new = {field_name}::/* new type */;

-- Step 3: Drop old column
ALTER TABLE {table_name} DROP COLUMN {field_name};

-- Step 4: Rename new column
ALTER TABLE {table_name} RENAME COLUMN {field_name}_new TO {field_name};
```

---

## Summary

You've created a database migration with:

✅ Generated migration file  
✅ Updated database schema definition  
✅ Updated domain types  
✅ Updated validation schemas  
✅ Updated transformers  
✅ Updated API contracts (if needed)  
✅ Verified type alignment  
✅ Tested migration forward and backward  
✅ Ensured data integrity

## Best Practices

1. **Always test migrations on development database first**
2. **Create rollback migrations for production deployments**
3. **Use transactions for complex migrations**
4. **Add comments to explain non-obvious changes**
5. **Verify type alignment after every migration**
6. **Test with realistic data volumes**
7. **Document breaking changes in migration comments**
8. **Keep migrations small and focused**
9. **Never modify applied migrations in production**
10. **Back up production database before major migrations**

## Next Steps

1. Review migration with team
2. Test on staging environment
3. Create deployment plan
4. Update API documentation
5. Notify dependent teams of changes
6. Schedule production deployment
7. Monitor application after deployment
