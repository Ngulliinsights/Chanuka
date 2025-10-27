# Database Reset and Recovery Guide

This directory contains scripts to fix the database schema corruption issues identified in the Chanuka Platform.

## Problem Summary

The database had multiple conflicting migrations that caused:
- Column conflicts (e.g., 'token' column already exists in sessions table)
- Missing tables (users, sessions, etc.)
- Constraint failures in compliance_checks table
- Service initialization failures

## Solution

A comprehensive database reset that:
1. Drops all existing tables and constraints
2. Cleans up conflicting migration files
3. Applies a single, comprehensive schema migration
4. Verifies schema integrity

## Scripts

### `reset-database.ts`
Complete database reset script that safely drops all tables and applies clean schema.

```bash
npm run db:reset
```

### `health-check.ts`
Comprehensive health check that verifies:
- Database connectivity
- Table existence
- Constraint integrity
- Index presence
- Migration state

```bash
npm run db:health
```

### `run-reset.sh`
Interactive script that safely guides through the reset process with confirmations.

```bash
npm run db:reset:safe
```

### `migrate.ts`
Simple migration runner for applying the clean schema.

```bash
npm run db:migrate
```

## Usage Instructions

### Option 1: Safe Interactive Reset (Recommended)
```bash
npm run db:reset:safe
```
This will:
- Ask for confirmation before proceeding
- Run the complete reset process
- Perform health checks
- Provide next steps

### Option 2: Direct Reset
```bash
npm run db:reset
npm run db:health
```

### Option 3: Manual Steps
```bash
# 1. Reset database
npx tsx scripts/database/reset-database.ts

# 2. Check health
npx tsx scripts/database/health-check.ts

# 3. Start server
npm run dev
```

## What Gets Reset

### Dropped:
- All existing tables
- All sequences
- All functions
- Migration tracking table
- Conflicting migration files

### Created:
- Clean, comprehensive schema with all required tables
- Proper constraints and indexes
- Triggers for updated_at timestamps
- Search vector functionality for bills
- Single migration entry

## Schema Overview

The clean schema includes:

### Core Tables:
- `users` - User accounts and authentication
- `user_profiles` - Extended user information
- `sessions` - Session management
- `bills` - Legislative bills
- `sponsors` - Bill sponsors/legislators
- `comments` - User comments on bills

### Feature Tables:
- `bill_engagement` - User interaction tracking
- `notifications` - System notifications
- `alert_preferences` - User notification settings
- `compliance_checks` - Security compliance monitoring
- `user_verification` - User verification system

### Analytics Tables:
- `analytics_events` - User behavior tracking
- `security_events` - Security monitoring
- `bill_tracking_preferences` - Bill tracking settings

## Verification

After reset, the health check verifies:
- ✅ All essential tables exist
- ✅ Proper constraints are in place
- ✅ Indexes are created
- ✅ No duplicate migrations
- ✅ Critical operations work
- ✅ Compliance checks have unique constraints

## Troubleshooting

### If reset fails:
1. Check DATABASE_URL is correctly set
2. Ensure database is accessible
3. Verify you have proper permissions
4. Check the error logs for specific issues

### If health check fails:
1. Review the specific failed checks
2. Re-run the reset if tables are missing
3. Check database permissions
4. Verify migration files are clean

### If server still has issues:
1. Restart the server after database reset
2. Check server logs for remaining errors
3. Verify all services can connect to database
4. Test basic operations (user creation, etc.)

## Recovery Process

1. **Backup** (if needed): Export any critical data before reset
2. **Reset**: Run the database reset script
3. **Verify**: Run health checks to confirm schema integrity
4. **Test**: Start server and verify all services initialize
5. **Seed** (optional): Add sample data for testing

## Next Steps After Reset

1. Start the server: `npm run dev`
2. Test user registration/login
3. Verify bill data can be loaded
4. Check that all services start without errors
5. Test core functionality

The database should now be in a clean, consistent state that supports all platform features without the previous schema conflicts.