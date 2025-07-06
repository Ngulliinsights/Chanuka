# Database Migrations for LegalEase

This directory contains SQL migration files that define and update the database schema for the LegalEase application.

## Migration Files

- `0000_initial_migration.sql` - Initial database setup with users table
- `0001_comprehensive_schema.sql` - Comprehensive schema implementation with all tables defined in TypeScript schema

## Running Migrations

There are multiple ways to run the migrations:

### Using npm scripts

```bash
# Using TypeScript migration script (recommended)
npm run db:migrate:ts

# Using JavaScript migration script
npm run db:migrate:js

# Using the existing migration command
npm run db:migrate
```

### Manual Migration

You can also manually apply migrations by connecting to your PostgreSQL database and running the SQL files directly:

```bash
psql -U your_username -d your_database -f drizzle/0000_initial_migration.sql
psql -U your_username -d your_database -f drizzle/0001_comprehensive_schema.sql
```

## Migration Process

The migration process:

1. Checks if the database is in read-write mode
2. Creates the `drizzle_migrations` table if it doesn't exist
3. Applies all pending migrations in sequential order
4. Records each successful migration in the `drizzle_migrations` table
5. Verifies all tables are created with proper relationships

## Schema Synchronization

The migrations ensure that the database schema matches the TypeScript schema defined in `shared/schema.ts`. This includes:

- Creating all required tables
- Setting up proper indexes and constraints
- Establishing relationships between tables
- Creating enum types
- Setting up triggers for automatic timestamp updates

## Troubleshooting

If you encounter issues with migrations:

1. Check database connection settings in your environment variables
2. Ensure the database user has sufficient privileges
3. Verify the database is in read-write mode
4. Check for any error messages in the migration output
