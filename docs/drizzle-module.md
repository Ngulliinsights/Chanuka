# Drizzle Module Documentation

## Overview and Purpose

The drizzle module manages database schema definitions, migrations, and schema evolution for the Chanuka platform. It uses Drizzle ORM to provide type-safe database operations and maintain database schema consistency across development, staging, and production environments.

## Key Components and Subdirectories

### Migration Files
- **`0021_clean_comprehensive_schema.sql`** - Comprehensive schema cleanup
- **`0022_fix_schema_alignment.sql`** - Schema alignment fixes
- **`0023_migration_infrastructure.sql`** - Migration infrastructure setup
- **`0024_migration_infrastructure.sql`** - Additional migration infrastructure
- **`0025_postgresql_fulltext_enhancements.sql`** - Full-text search enhancements
- **`0026_optimize_search_indexes.sql`** - Search index optimization
- **`20251104110148_soft_captain_marvel.sql`** - Feature migration
- **`20251104110149_advanced_discovery.sql`** - Advanced discovery features
- **`20251104110150_real_time_engagement.sql`** - Real-time engagement features
- **`20251104110151_transparency_intelligence.sql`** - Transparency intelligence
- **`20251104110152_expert_verification.sql`** - Expert verification system

### Configuration
- **`drizzle.config.ts`** - Drizzle configuration and settings
- **`config.ts`** - Additional configuration (from root)

### Documentation
- **`COMPREHENSIVE_MIGRATION_SUMMARY.md`** - Summary of all migrations
- **`LEGACY_MIGRATION_ARCHIVE.md`** - Archive of legacy migrations

### Schema Validation
- **`legacy_migration_validation.sql`** - Validation scripts for legacy migrations

### Migration Metadata
- **`meta/`** - Migration metadata and snapshots
  - **`_journal.json`** - Migration journal
  - **`0000_snapshot.json`** - Initial schema snapshot
  - **`0001_snapshot.json`** - First migration snapshot
  - **`0002_snapshot.json`** - Second migration snapshot
  - **`0021_snapshot.json`** - Clean schema snapshot
  - **`20251104110148_snapshot.json`** - Recent migration snapshots

## Technology Stack and Dependencies

### Core ORM
- **Drizzle ORM 0.38.4** - Type-safe SQL query builder
- **Drizzle Kit 0.27.1** - Migration and schema management tools

### Database
- **PostgreSQL** - Primary database engine
- **pg 8.16.3** - PostgreSQL client for Node.js

### Development Tools
- **tsx** - TypeScript execution for migration scripts
- **TypeScript 5.6.3** - Type checking and compilation

## How it Relates to Other Modules

### Shared Module
- **Schema Source**: Uses schemas defined in shared/schema/
- **Type Generation**: Generates TypeScript types from shared schemas
- **Migration Foundation**: Migrations based on shared schema definitions

### Server Module
- **Database Operations**: Server uses Drizzle for all database queries
- **Migration Execution**: Server runs migrations during startup
- **Connection Management**: Server manages database connections for Drizzle

### Scripts Module
- **Migration Scripts**: Scripts module contains migration execution scripts
- **Database Utilities**: Database setup and maintenance scripts
- **Migration Validation**: Scripts validate migration integrity

### Tests Module
- **Database Tests**: Tests validate database operations and migrations
- **Schema Testing**: Tests ensure schema integrity
- **Migration Testing**: Tests verify migration correctness

## Notable Features and Patterns

### Type-Safe Database Operations
- **Compile-Time Safety**: Database queries checked at compile time
- **Schema Validation**: Runtime validation of data against schemas
- **Type Generation**: Automatic TypeScript types from database schema

### Migration Management
- **Incremental Migrations**: Small, focused migration files
- **Rollback Support**: Ability to rollback migrations safely
- **Migration Validation**: Automated validation of migration integrity
- **Version Control**: Migrations tracked in version control

### Schema Evolution
- **Non-Breaking Changes**: Migrations designed to avoid breaking changes
- **Backward Compatibility**: Schema changes maintain backward compatibility
- **Data Preservation**: Migrations preserve existing data during schema changes

### Performance Optimization
- **Index Management**: Optimized database indexes for query performance
- **Full-Text Search**: PostgreSQL full-text search capabilities
- **Query Optimization**: Efficient query patterns and indexing strategies

### Development Workflow
- **Local Development**: Easy local database setup and migration
- **Testing Environments**: Consistent schema across dev/test/prod
- **CI/CD Integration**: Automated migration in deployment pipeline

### Schema Organization
- **Domain-Driven**: Schemas organized by business domain
- **Modular Design**: Separate schema files for different features
- **Relationship Management**: Proper foreign key relationships

### Migration Patterns
- **Transactional**: All migrations run in transactions for safety
- **Idempotent**: Migrations can be run multiple times safely
- **Documented**: Each migration includes documentation of changes

### Monitoring and Maintenance
- **Migration History**: Complete audit trail of schema changes
- **Performance Monitoring**: Database performance tracking
- **Health Checks**: Database connectivity and schema validation

### Security Considerations
- **SQL Injection Prevention**: Parameterized queries prevent SQL injection
- **Access Control**: Database-level access controls and permissions
- **Data Sanitization**: Input validation and sanitization

### Backup and Recovery
- **Schema Backups**: Schema snapshots for recovery
- **Migration Rollback**: Ability to rollback to previous schema versions
- **Data Integrity**: Validation ensures data integrity during migrations

### Cross-Environment Consistency
- **Environment Parity**: Same schema across all environments
- **Configuration Management**: Environment-specific configuration
- **Migration Testing**: Migrations tested before production deployment

### Documentation and Governance
- **Migration Documentation**: Comprehensive documentation of changes
- **Schema Documentation**: Clear documentation of table structures
- **Change Management**: Formal process for schema changes

### Advanced Features
- **Full-Text Search**: Advanced search capabilities with PostgreSQL
- **JSON Support**: JSON column support for flexible data
- **Array Types**: PostgreSQL array type support
- **Custom Types**: Domain-specific custom database types

### Performance Patterns
- **Connection Pooling**: Efficient connection management
- **Query Batching**: Batch operations for performance
- **Indexing Strategy**: Strategic indexing for common query patterns
- **Partitioning**: Table partitioning for large datasets