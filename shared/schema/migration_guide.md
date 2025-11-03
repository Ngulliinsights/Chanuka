# Database Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the current unified schema to the new domain-organized schema architecture.

## Pre-Migration Checklist

### 1. Backup Current Database

```sql
-- Create full database backup
pg_dump -h localhost -U postgres kenya_legislative_platform > backup_$(date +%Y%m%d_%H%M%S).sql

-- Verify backup integrity
pg_restore --list backup_*.sql
```

### 2. Set Up New Schema Structure

```sql
-- Create new schemas
CREATE SCHEMA IF NOT EXISTS foundation;
CREATE SCHEMA IF NOT EXISTS citizen_participation;
CREATE SCHEMA IF NOT EXISTS parliamentary_process;
CREATE SCHEMA IF NOT EXISTS constitutional_intelligence;
CREATE SCHEMA IF NOT EXISTS argument_intelligence;
CREATE SCHEMA IF NOT EXISTS advocacy_coordination;
CREATE SCHEMA IF NOT EXISTS universal_access;
CREATE SCHEMA IF NOT EXISTS integrity_operations;
CREATE SCHEMA IF NOT EXISTS platform_operations;
```

### 3. Install Required Extensions

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

## Migration Steps

### Step 1: Foundation Schema Migration

#### Migrate Users and Profiles

```sql
-- Create users table in foundation schema
CREATE TABLE foundation.users AS
SELECT * FROM public.users;

-- Create user_profiles table in foundation schema
CREATE TABLE foundation.user_profiles AS
SELECT * FROM public.user_profiles;

-- Update foreign key relationships
ALTER TABLE foundation.user_profiles
ADD CONSTRAINT fk_user_profiles_users
FOREIGN KEY (user_id) REFERENCES foundation.users(id);
```

#### Migrate Legislative Entities

```sql
-- Migrate sponsors
CREATE TABLE foundation.sponsors AS
SELECT * FROM public.sponsors;

-- Migrate committees
CREATE TABLE foundation.committees AS
SELECT * FROM public.committees;

-- Migrate committee members
CREATE TABLE foundation.committee_members AS
SELECT * FROM public.committee_members;

-- Migrate parliamentary sessions
CREATE TABLE foundation.parliamentary_sessions AS
SELECT * FROM public.parliamentary_sessions;

-- Migrate parliamentary sittings
CREATE TABLE foundation.parliamentary_sittings AS
SELECT * FROM public.parliamentary_sittings;

-- Migrate bills
CREATE TABLE foundation.bills AS
SELECT * FROM public.bills;

-- Update foreign key relationships
ALTER TABLE foundation.parliamentary_sittings
ADD CONSTRAINT fk_sittings_sessions
FOREIGN KEY (session_id) REFERENCES foundation.parliamentary_sessions(id);

ALTER TABLE foundation.bills
ADD CONSTRAINT fk_bills_sponsors
FOREIGN KEY (sponsor_id) REFERENCES foundation.sponsors(id);
```

### Step 2: Citizen Participation Migration

#### Migrate Sessions and Comments

```sql
-- Migrate sessions
CREATE TABLE citizen_participation.sessions AS
SELECT * FROM public.sessions;

-- Migrate comments
CREATE TABLE citizen_participation.comments AS
SELECT * FROM public.comments;

-- Migrate comment votes
CREATE TABLE citizen_participation.comment_votes AS
SELECT * FROM public.comment_votes;

-- Migrate bill votes
CREATE TABLE citizen_participation.bill_votes AS
SELECT * FROM public.bill_votes;

-- Migrate bill engagement
CREATE TABLE citizen_participation.bill_engagement AS
SELECT * FROM public.bill_engagement;

-- Update foreign key relationships
ALTER TABLE citizen_participation.sessions
ADD CONSTRAINT fk_sessions_users
FOREIGN KEY (user_id) REFERENCES foundation.users(id);

ALTER TABLE citizen_participation.comments
ADD CONSTRAINT fk_comments_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_comments_users
FOREIGN KEY (user_id) REFERENCES foundation.users(id);

ALTER TABLE citizen_participation.comment_votes
ADD CONSTRAINT fk_comment_votes_comments
FOREIGN KEY (comment_id) REFERENCES citizen_participation.comments(id),
ADD CONSTRAINT fk_comment_votes_users
FOREIGN KEY (user_id) REFERENCES foundation.users(id);

ALTER TABLE citizen_participation.bill_votes
ADD CONSTRAINT fk_bill_votes_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_bill_votes_users
FOREIGN KEY (user_id) REFERENCES foundation.users(id);
```

### Step 3: Parliamentary Process Migration

#### Migrate Process Tables

```sql
-- Migrate bill committee assignments
CREATE TABLE parliamentary_process.bill_committee_assignments AS
SELECT * FROM public.bill_committee_assignments;

-- Migrate bill amendments
CREATE TABLE parliamentary_process.bill_amendments AS
SELECT * FROM public.bill_amendments;

-- Migrate bill versions
CREATE TABLE parliamentary_process.bill_versions AS
SELECT * FROM public.bill_versions;

-- Migrate bill readings
CREATE TABLE parliamentary_process.bill_readings AS
SELECT * FROM public.bill_readings;

-- Migrate parliamentary votes
CREATE TABLE parliamentary_process.parliamentary_votes AS
SELECT * FROM public.parliamentary_votes;

-- Migrate bill cosponsors
CREATE TABLE parliamentary_process.bill_cosponsors AS
SELECT * FROM public.bill_cosponsors;

-- Update foreign key relationships
ALTER TABLE parliamentary_process.bill_committee_assignments
ADD CONSTRAINT fk_bill_committee_assignments_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_bill_committee_assignments_committees
FOREIGN KEY (committee_id) REFERENCES foundation.committees(id);

ALTER TABLE parliamentary_process.bill_amendments
ADD CONSTRAINT fk_bill_amendments_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_bill_amendments_proposers
FOREIGN KEY (proposer_id) REFERENCES foundation.sponsors(id);

ALTER TABLE parliamentary_process.parliamentary_votes
ADD CONSTRAINT fk_parliamentary_votes_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_parliamentary_votes_sponsors
FOREIGN KEY (sponsor_id) REFERENCES foundation.sponsors(id);

ALTER TABLE parliamentary_process.bill_cosponsors
ADD CONSTRAINT fk_bill_cosponsors_bills
FOREIGN KEY (bill_id) REFERENCES foundation.bills(id),
ADD CONSTRAINT fk_bill_cosponsors_sponsors
FOREIGN KEY (sponsor_id) REFERENCES foundation.sponsors(id);
```

### Step 4: New Schema Implementation

#### Create Constitutional Intelligence Tables

```sql
-- Create constitutional provisions table
CREATE TABLE constitutional_intelligence.constitutional_provisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_number INTEGER,
    chapter_title VARCHAR(255),
    part_number INTEGER,
    part_title VARCHAR(255),
    article_number INTEGER NOT NULL,
    article_title VARCHAR(255) NOT NULL,
    section_number VARCHAR(20),
    subsection_number VARCHAR(20),
    provision_text TEXT NOT NULL,
    provision_summary TEXT,
    parent_provision_id UUID REFERENCES constitutional_intelligence.constitutional_provisions(id),
    hierarchy_path VARCHAR(100),
    rights_category VARCHAR(100),
    keywords TEXT[],
    related_provisions UUID[],
    search_vector TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create constitutional analyses table
CREATE TABLE constitutional_intelligence.constitutional_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES foundation.bills(id) ON DELETE CASCADE,
    provision_id UUID NOT NULL REFERENCES constitutional_intelligence.constitutional_provisions(id),
    analysis_type VARCHAR(50) NOT NULL,
    confidence_level NUMERIC(3,2) NOT NULL,
    analysis_text TEXT NOT NULL,
    reasoning_chain JSONB,
    supporting_precedents UUID[],
    constitutional_risk VARCHAR(20) NOT NULL,
    risk_explanation TEXT,
    requires_expert_review BOOLEAN NOT NULL DEFAULT FALSE,
    expert_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    expert_review_date TIMESTAMP,
    expert_notes TEXT,
    analysis_method VARCHAR(100) NOT NULL,
    analysis_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Create Argument Intelligence Tables

```sql
-- Create arguments table
CREATE TABLE argument_intelligence.arguments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES citizen_participation.comments(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES foundation.bills(id) ON DELETE CASCADE,
    argument_type VARCHAR(50) NOT NULL,
    position VARCHAR(20) NOT NULL,
    extracted_text TEXT NOT NULL,
    normalized_text TEXT,
    topic_tags TEXT[],
    affected_groups TEXT[],
    extraction_confidence NUMERIC(3,2) NOT NULL,
    coherence_score NUMERIC(3,2),
    evidence_quality VARCHAR(20),
    parent_argument_id UUID REFERENCES argument_intelligence.arguments(id),
    claim_id UUID REFERENCES argument_intelligence.claims(id),
    extraction_method VARCHAR(100) NOT NULL,
    extraction_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create claims table
CREATE TABLE argument_intelligence.claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES foundation.bills(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    claim_summary VARCHAR(500),
    position VARCHAR(20) NOT NULL,
    argument_cluster_size INTEGER NOT NULL DEFAULT 1,
    source_arguments UUID[],
    expressing_users_count INTEGER NOT NULL DEFAULT 0,
    counties_represented kenyan_county[],
    demographic_spread JSONB,
    supporting_evidence_count INTEGER NOT NULL DEFAULT 0,
    evidence_quality_avg NUMERIC(3,2),
    expert_endorsements INTEGER NOT NULL DEFAULT 0,
    importance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    novelty_score NUMERIC(3,2),
    claim_category VARCHAR(100),
    affected_provisions UUID[],
    fact_check_status verification_status NOT NULL DEFAULT 'pending',
    fact_check_notes TEXT,
    fact_check_sources TEXT[],
    included_in_briefs INTEGER NOT NULL DEFAULT 0,
    legislative_response TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Step 5: Data Validation and Testing

#### Validate Migration Integrity

```sql
-- Check row counts match
SELECT 'users' as table_name, COUNT(*) as row_count FROM foundation.users
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM foundation.user_profiles
UNION ALL
SELECT 'sponsors', COUNT(*) FROM foundation.sponsors
UNION ALL
SELECT 'bills', COUNT(*) FROM foundation.bills
ORDER BY table_name;

-- Compare with original counts
SELECT 'public.users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'public.user_profiles', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'public.sponsors', COUNT(*) FROM public.sponsors
UNION ALL
SELECT 'public.bills', COUNT(*) FROM public.bills
ORDER BY table_name;
```

#### Test Foreign Key Relationships

```sql
-- Test bill-sponsor relationship
SELECT COUNT(*) as bills_with_sponsors
FROM foundation.bills b
JOIN foundation.sponsors s ON b.sponsor_id = s.id
WHERE b.sponsor_id IS NOT NULL;

-- Test comment-bill relationship
SELECT COUNT(*) as comments_with_bills
FROM citizen_participation.comments c
JOIN foundation.bills b ON c.bill_id = b.id;
```

### Step 6: Application Updates

#### Update Database Connection Configuration

```typescript
// Update database connection strings
const databaseConfig = {
  foundation: {
    host: process.env.FOUNDATION_DB_HOST,
    port: process.env.FOUNDATION_DB_PORT,
    database: process.env.FOUNDATION_DB_NAME,
    user: process.env.FOUNDATION_DB_USER,
    password: process.env.FOUNDATION_DB_PASSWORD,
  },
  citizenParticipation: {
    host: process.env.CITIZEN_PARTICIPATION_DB_HOST,
    port: process.env.CITIZEN_PARTICIPATION_DB_PORT,
    database: process.env.CITIZEN_PARTICIPATION_DB_NAME,
    user: process.env.CITIZEN_PARTICIPATION_DB_USER,
    password: process.env.CITIZEN_PARTICIPATION_DB_PASSWORD,
  },
  // ... other schemas
};
```

#### Update ORM Mappings

```typescript
// Update Drizzle ORM schema imports
import { users, user_profiles, bills, comments, comment_votes } from "./schema";

// Update query builders to use new schema organization
const userWithProfile = await db
  .select()
  .from(users)
  .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
  .where(eq(users.id, userId));
```

## Post-Migration Verification

### 1. Data Integrity Checks

```sql
-- Verify no orphaned records
SELECT 'orphaned_comments' as check_name, COUNT(*) as issue_count
FROM citizen_participation.comments c
LEFT JOIN foundation.bills b ON c.bill_id = b.id
WHERE b.id IS NULL

UNION ALL

SELECT 'orphaned_votes', COUNT(*)
FROM citizen_participation.bill_votes v
LEFT JOIN foundation.bills b ON v.bill_id = b.id
WHERE b.id IS NULL

UNION ALL

SELECT 'orphaned_sessions', COUNT(*)
FROM citizen_participation.sessions s
LEFT JOIN foundation.users u ON s.user_id = u.id
WHERE u.id IS NULL;
```

### 2. Performance Testing

```sql
-- Test query performance on new schema
EXPLAIN ANALYZE
SELECT b.*, COUNT(c.id) as comment_count
FROM foundation.bills b
LEFT JOIN citizen_participation.comments c ON b.id = c.bill_id
WHERE b.status = 'introduced'
GROUP BY b.id
ORDER BY comment_count DESC
LIMIT 10;
```

### 3. Application Testing

- Test user registration and authentication
- Test bill viewing and commenting
- Test voting functionality
- Test notification systems
- Test moderation workflows

## Rollback Plan

If migration issues are encountered:

1. **Immediate Rollback**

   ```sql
   -- Restore from backup
   pg_restore -h localhost -U postgres -d kenya_legislative_platform backup_*.sql
   ```

2. **Gradual Rollback**

   ```sql
   -- Drop new schema tables
   DROP SCHEMA foundation CASCADE;
   DROP SCHEMA citizen_participation CASCADE;
   -- ... other schemas
   ```

3. **Application Rollback**
   - Revert to previous application version
   - Update database connection configuration
   - Clear application caches

## Best Practices

### 1. Migration Execution

- Run migrations during low-traffic periods
- Use database transactions for atomic operations
- Implement idempotent migration scripts
- Test migrations in staging environment first

### 2. Monitoring

- Monitor database performance during migration
- Track migration progress and completion times
- Set up alerts for migration failures
- Log all migration activities

### 3. Validation

- Verify data integrity after each migration step
- Test application functionality after migration
- Validate performance metrics
- Confirm user experience remains intact

## Support and Troubleshooting

### Common Issues

1. **Foreign Key Violations**: Check data integrity before migration
2. **Performance Degradation**: Optimize indexes and queries
3. **Application Errors**: Update ORM mappings and queries
4. **Data Loss**: Ensure backups are complete and tested

### Getting Help

- Review migration logs for specific error messages
- Test individual migration steps in isolation
- Consult database architecture documentation
- Contact development team for complex issues

## Conclusion

This migration guide provides a structured approach to transitioning from the current unified schema to the new domain-organized architecture. Following these steps will ensure data integrity, minimize downtime, and maintain application functionality throughout the migration process.
