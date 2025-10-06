# Database Migration System

This directory contains the database migration system for the Chanuka Legislative Transparency Platform. The migration system provides comprehensive database schema management with rollback capabilities, data validation, and integrity checks.

## Features

- **Rollback Support**: All migrations include rollback SQL for safe schema changes
- **Data Validation**: Comprehensive integrity checks and validation rules
- **Transaction Safety**: All migrations run in transactions with automatic rollback on failure
- **Performance Monitoring**: Track migration execution times and performance
- **Content Validation**: Validate migration files before execution
- **Automated Fixes**: Auto-fix common data integrity issues

## Migration Files

Migration files follow the naming convention: `NNNN_description.sql`

### Current Migrations

- `0000_initial_migration.sql` - Initial database schema
- `0001_comprehensive_schema.sql` - Complete legislative platform schema
- `0002_add_bill_engagement.sql` - Bill engagement tracking
- `0003_add_comment_features.sql` - Comment system enhancements
- `0003_enhanced_comments_system.sql` - Advanced comment features
- `0004_fix_schema.sql` - Schema fixes and optimizations
- `0005_complete_schema_update.sql` - Complete schema updates
- `0006_fix_implementation_workarounds.sql` - Implementation fixes
- `0007_add_sponsorship_tables.sql` - Sponsor relationship tracking
- `0008_seed_sponsorship_data.sql` - Sponsor data seeding
- `0009_add_citizen_verification.sql` - Citizen verification system
- `0010_add_search_vectors_and_indexes.sql` - Full-text search and performance indexes
- `0011_add_moderation_and_analytics.sql` - Content moderation and analytics

## Usage

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Validate database integrity
npm run migrate:validate

# Preview migrations without executing (dry run)
npm run migrate:up -- --dry-run
```

### Creating New Migrations

```bash
# Create a new migration file
npm run migrate:create add_user_preferences

# This creates: drizzle/NNNN_add_user_preferences.sql
```

### Rolling Back Migrations

```bash
# Rollback a specific migration (requires --force)
npm run migrate:down -- --target 0010_add_search_vectors_and_indexes.sql --force

# Preview rollback without executing
npm run migrate:down -- --target 0010_add_search_vectors_and_indexes.sql --dry-run
```

### Database Validation

```bash
# Run all validation rules
npm run migrate:validate

# This checks for:
# - Orphaned records
# - Data consistency issues
# - Performance problems
# - Security concerns
# - Content moderation issues
```

## Migration File Structure

Each migration file should follow this structure:

```sql
-- Migration: Description of what this migration does
-- Description: Detailed explanation if needed

-- Main migration SQL
CREATE TABLE example_table (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_example_name ON example_table(name);

-- ROLLBACK:
-- SQL to undo this migration
DROP INDEX IF EXISTS idx_example_name;
DROP TABLE IF EXISTS example_table;
-- END ROLLBACK
```

## Key Features

### 1. Search Vectors and Indexes (Migration 0010)

Adds full-text search capabilities:
- PostgreSQL tsvector for bill content search
- Automatic search vector updates via triggers
- GIN indexes for fast full-text search
- Performance indexes for common query patterns

### 2. Moderation and Analytics (Migration 0011)

Adds content moderation and analytics:
- Moderation queue for content review
- Analytics events tracking
- Daily analytics summaries
- User activity summaries
- Bill analytics summaries
- Content flagging system
- System health metrics

### 3. Data Validation Rules

The system includes comprehensive validation rules:

#### Error-Level Checks
- Orphaned records (comments without bills, etc.)
- Users without password hashes
- Duplicate email addresses
- High priority moderation items

#### Warning-Level Checks
- Bills without titles
- Users without names
- Future-dated bills
- Negative engagement scores
- Inactive users with recent activity
- Unmoderated flagged content

#### Info-Level Checks
- Bills without search vectors
- Missing user activity summaries
- Stale analytics data

### 4. Automatic Fixes

The system can automatically fix common issues:
- Remove orphaned records
- Clean up invalid data
- Repair broken relationships

## Safety Features

### Transaction Safety
All migrations run in database transactions. If any part fails, the entire migration is rolled back.

### Validation Before Execution
Migrations are validated for:
- Proper filename format
- Dangerous operations (with warnings)
- SQL syntax issues
- Rollback availability

### Rollback Support
Every migration includes rollback SQL to safely undo changes.

### Dry Run Mode
Preview what migrations would do without making changes.

## Monitoring and Logging

The migration system tracks:
- Execution times for performance monitoring
- Migration history with timestamps
- Validation results and issues
- System health metrics

## Best Practices

### Writing Migrations

1. **Always include rollback SQL**
2. **Use IF NOT EXISTS for CREATE statements**
3. **Test migrations on development data first**
4. **Keep migrations focused and atomic**
5. **Document complex changes**

### Running Migrations

1. **Always backup production data first**
2. **Run migrations during maintenance windows**
3. **Monitor system performance after migrations**
4. **Validate data integrity after major changes**
5. **Keep rollback procedures ready**

## Troubleshooting

### Common Issues

1. **Migration fails with constraint violation**
   - Check for data that violates new constraints
   - Use data validation to identify issues
   - Consider data cleanup before migration

2. **Performance degradation after migration**
   - Check if new indexes are being used
   - Analyze query performance
   - Consider VACUUM ANALYZE after large changes

3. **Rollback fails**
   - Check rollback SQL syntax
   - Ensure rollback doesn't violate constraints
   - May need manual intervention for complex rollbacks

### Getting Help

1. Check migration logs for detailed error messages
2. Run validation to identify data issues
3. Use dry-run mode to preview changes
4. Review migration file for syntax errors

## Development

### Testing Migrations

The migration system includes comprehensive tests:

```bash
# Run migration system tests
npm test -- migration-service.test.ts
```

### Adding New Validation Rules

Edit `server/services/data-validation-service.ts` to add new validation rules:

```typescript
{
  name: 'my_validation_rule',
  description: 'Check for my specific issue',
  query: 'SELECT * FROM table WHERE condition',
  severity: 'warning'
}
```

### Extending the Migration Service

The `MigrationService` class can be extended for custom functionality:
- Custom validation rules
- Additional safety checks
- Integration with external systems
- Custom reporting features