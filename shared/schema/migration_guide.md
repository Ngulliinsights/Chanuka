# Database Migration Guide

## Overview

This guide helps you migrate from the old schema structure to the new comprehensive domain-driven architecture with all critical gaps addressed.

## Migration Steps

### 1. Backup Current Database
```bash
# Create a backup before migration
pg_dump your_database_name > backup_before_migration.sql
```

### 2. Generate Migration Files

The new schema includes 7 major domains with 51+ new tables. You'll need to generate migration files for:

#### Core Enhancements:
- Enhanced `user_profiles` table with contact information
- New `user_contact_methods` table
- Enhanced `alert_preferences` table

#### New Domain Tables:

**Parliamentary Process Domain (9 tables):**
- `bill_committee_assignments`
- `bill_amendments` 
- `bill_versions`
- `bill_readings`
- `parliamentary_votes`
- `bill_cosponsors`
- `public_participation_events`
- `public_submissions`
- `public_hearings`

**Constitutional Intelligence Domain (5 tables):**
- `constitutional_provisions`
- `constitutional_analyses`
- `legal_precedents`
- `expert_review_queue`
- `analysis_audit_trail`

**Argument Intelligence Domain (6 tables):**
- `arguments`
- `claims`
- `evidence`
- `argument_relationships`
- `legislative_briefs`
- `synthesis_jobs`

**Advocacy Coordination Domain (6 tables):**
- `campaigns`
- `action_items`
- `campaign_participants`
- `action_completions`
- `campaign_impact_metrics`
- `coalition_relationships`

**Universal Access Domain (6 tables):**
- `ambassadors`
- `communities`
- `facilitation_sessions`
- `offline_submissions`
- `ussd_sessions`
- `localized_content`

**Transparency Analysis Domain (6 tables):**
- `corporate_entities`
- `financial_interests`
- `lobbying_activities`
- `bill_financial_conflicts`
- `cross_sector_ownership`
- `regulatory_capture_indicators`

**Impact Measurement Domain (12 tables):**
- `participation_cohorts`
- `legislative_outcomes`
- `bill_implementation`
- `attribution_assessments`
- `success_stories`
- `geographic_equity_metrics`
- `demographic_equity_metrics`
- `digital_inclusion_metrics`
- `platform_performance_indicators`
- `legislative_impact_indicators`
- `civic_engagement_indicators`
- `financial_sustainability_indicators`

### 3. Using Drizzle Kit

If you're using Drizzle Kit for migrations:

```bash
# Generate migration files
npx drizzle-kit generate:pg

# Apply migrations
npx drizzle-kit push:pg
```

### 4. Manual Migration Script

If you need to create migrations manually, here's the order:

```sql
-- 1. First, add new enums (if not already present)
-- 2. Enhance existing tables (user_profiles, alert_preferences)
-- 3. Create new tables in dependency order:
--    - Foundation tables first
--    - Then tables that reference foundation tables
--    - Finally, cross-reference tables

-- Example for user_profiles enhancement:
ALTER TABLE user_profiles 
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN phone_verified BOOLEAN DEFAULT false,
ADD COLUMN phone_verification_code VARCHAR(10),
ADD COLUMN phone_verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN email_notifications_consent BOOLEAN DEFAULT true,
ADD COLUMN sms_notifications_consent BOOLEAN DEFAULT false,
ADD COLUMN marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN data_processing_consent BOOLEAN DEFAULT true,
ADD COLUMN consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
ADD COLUMN accessibility_needs JSONB DEFAULT '{}',
ADD COLUMN emergency_contact_name VARCHAR(200),
ADD COLUMN emergency_contact_phone VARCHAR(20),
ADD COLUMN emergency_contact_relationship VARCHAR(50);

-- Add indexes
CREATE INDEX idx_user_profiles_phone_number ON user_profiles(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_user_profiles_phone_verified ON user_profiles(phone_verified, phone_number) WHERE phone_verified = true AND phone_number IS NOT NULL;
```

### 5. Data Migration Considerations

#### Contact Information Migration:
- Existing users will have NULL phone numbers initially
- You may want to prompt users to add phone numbers on next login
- Set default consent values based on your privacy policy

#### Localization Migration:
- Set default language to 'en' for existing users
- Set default timezone to 'Africa/Nairobi'
- Accessibility needs will be empty JSON objects initially

#### New Domain Data:
- Most new domain tables will start empty
- You may want to seed some initial data:
  - Constitutional provisions from Kenya's Constitution
  - Basic corporate entities for major companies
  - Initial participation cohorts for analysis

### 6. Post-Migration Steps

#### Verify Data Integrity:
```sql
-- Check that all foreign key relationships are valid
-- Verify that indexes were created properly
-- Test that new enum values work correctly
```

#### Update Application Code:
- Update service layer to use new contact methods
- Implement phone verification workflows
- Add support for new domains in your API endpoints
- Update frontend to handle new features

#### Seed Initial Data:
```sql
-- Add Kenya's constitutional provisions
-- Create initial participation cohorts
-- Set up basic corporate entities
-- Configure initial localized content
```

### 7. Rollback Plan

If you need to rollback:

```bash
# Restore from backup
psql your_database_name < backup_before_migration.sql
```

Or create a rollback migration that:
- Drops new tables in reverse dependency order
- Removes new columns from existing tables
- Drops new indexes and constraints

### 8. Testing Checklist

After migration, verify:

- [ ] All existing functionality still works
- [ ] New contact methods can be added and verified
- [ ] Notification preferences are respected
- [ ] New domain tables accept data correctly
- [ ] All foreign key relationships work
- [ ] Indexes improve query performance as expected
- [ ] Enum values are accepted correctly

### 9. Performance Considerations

The new schema includes comprehensive indexing, but monitor:

- Query performance on large tables
- Index usage and effectiveness
- JSONB query performance
- Array column query performance

Consider:
- Partitioning large tables by date
- Materialized views for complex analytics
- Read replicas for reporting queries

### 10. Security Considerations

The new schema includes sensitive data:

- Phone numbers and contact information
- Financial interests and conflicts
- Lobbying activities
- User consent and privacy settings

Ensure:
- Proper access controls are in place
- Sensitive data is encrypted at rest
- Audit trails are enabled
- GDPR compliance is maintained

## Troubleshooting

### Common Issues:

1. **Foreign Key Violations**: Ensure parent tables exist before creating child tables
2. **Enum Value Errors**: Make sure all enum values are defined before using them
3. **Index Creation Failures**: Check for duplicate index names or invalid WHERE clauses
4. **JSONB Issues**: Ensure JSONB columns have valid default values

### Getting Help:

If you encounter issues:
1. Check the PostgreSQL logs for detailed error messages
2. Verify that all dependencies are in place
3. Test migrations on a copy of production data first
4. Consider running migrations in smaller batches for large datasets

This migration represents a major architectural upgrade that transforms the platform from a basic bill tracker to a comprehensive civic engagement platform. Take time to test thoroughly and plan for user communication about new features.