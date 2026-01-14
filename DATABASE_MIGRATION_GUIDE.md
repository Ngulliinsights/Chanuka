# Database Migration Guide - SimpleTool

## Overview

This guide covers the fresh database migration for SimpleTool after clearing outdated tables. The new schema includes 10 core tables with modern PostgreSQL features (enums, JSONB, partial indexes, cascade rules).

---

## Prerequisites

- **PostgreSQL 15+** installed and running
- **Database created**: `simpletool`
- **psql** command-line tool available
- **Node.js 18+** and npm/pnpm installed

### Check Prerequisites

```bash
# Check PostgreSQL version
psql --version
# Output should show "psql (PostgreSQL) 15.x" or higher

# Check database exists
psql -U postgres -l | grep simpletool
# Should show: simpletool | postgres | UTF8
```

---

## Database Setup

### 1. Create Database (if not exists)

```bash
psql -U postgres -c "CREATE DATABASE simpletool WITH ENCODING 'UTF8';"
```

### 2. Verify Connection

```bash
psql -U postgres -d simpletool -c "SELECT version();"
```

Expected output:
```
PostgreSQL 15.x on ...
(1 row)
```

---

## Running the Migration

### Option A: Using Direct psql Command (Recommended)

**Fast and straightforward execution:**

```bash
# From project root - using OPTIMIZED migration (9 active tables only)
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables_optimized.sql

# OR original migration (if preferred)
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql
```

**Note**: The optimized migration includes only 9 actively-used tables (verified via git analysis), making it faster and cleaner.

Expected output:
```
CREATE TYPE
CREATE TYPE
...
CREATE TABLE
CREATE INDEX
...
```

### Option B: Using Migration Runner Script

**More control with error handling and reporting:**

```bash
# From project root
npx ts-node scripts/database/run-migrations-sql.ts
```

This will:
- ✅ Load database config from `.env.local`
- ✅ Find all `.sql` migration files in `drizzle/`
- ✅ Execute them in order
- ✅ Report success/failure for each migration

### Option C: Using npm Script

If available in `package.json`:

```bash
npm run db:migrate
# or
pnpm db:migrate
```

---

## Verifying the Migration

### Quick Verification (psql)

```bash
# Count tables
psql -U postgres -d simpletool -c "
  SELECT COUNT(*) as table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
"

# Expected output: 10

# List all tables
psql -U postgres -d simpletool -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
"

# Expected tables:
# - audit_log
# - bill_tracking
# - bills
# - comments
# - communities
# - community_membership
# - notifications
# - sessions
# - users
# - verifications
```

### Comprehensive Verification Script

**Recommended - checks everything:**

```bash
npx ts-node scripts/database/verify-schema.ts
```

This will:
- ✅ Count tables (expect 10)
- ✅ Verify enums (expect 6)
- ✅ Check indexes
- ✅ Display detailed table structure
- ✅ Generate verification report

Expected output:
```
✅ Schema Verification Report

📋 TABLES:
┌─ Found Tables ─────────────────────────────────────────┐
│ ✓ users                  │ Cols: 18  Idx:  4 │
│ ✓ bills                  │ Cols: 15  Idx:  5 │
...
└──────────────────────────────────────────────────────────┘

✓ All expected tables created

📊 ENUMS:
┓ ✓ chamber                                                │
│ ✓ party                                                  │
...

✓ All expected enums created

✅ Schema verification PASSED! Database is ready to use.
```

---

## Schema Overview

### Enum Types (6)

| Enum | Values |
|------|--------|
| `chamber` | upper_house, lower_house, unicameral |
| `party` | jubilee, odm, abantu, independent, etc. |
| `bill_status` | draft, pre_filed, filed, committee_review, passed, rejected, enacted |
| `user_role` | citizen, legislator, expert, moderator, admin |
| `kenyan_county` | nairobi, mombasa, kisumu, etc. (all 47 counties) |
| `anonymity_level` | identified, anonymous, pseudonymous |

### Tables (10)

#### 1. **users**
- Core user account management
- 18 columns including: email, password hash, 2FA secret, failed login attempts, account lock status
- Indexes: Email (unique), role + active status, county + active, last login timestamp

#### 2. **bills**
- Parliamentary bill tracking
- 15 columns including: bill number (unique), status, chamber, sponsor, co-sponsors (JSONB), tags (JSONB)
- Indexes: Bill number (unique), status, chamber, sponsor ID

#### 3. **communities**
- User engagement communities
- Slug (unique), is_public flag, member count, topics (JSONB)
- Indexes: Slug (unique), is_public, creation timestamp

#### 4. **comments**
- Nested comments on bills/communities
- Parent comment ID for threading, anonymity level, flagging/deletion tracking
- Indexes: Bill/community/user IDs, creation timestamp (covering), parent ID

#### 5. **bill_tracking**
- User-bill tracking preferences
- Composite unique: (user_id, bill_id)
- Tracks if user is following bill + notification preferences

#### 6. **community_membership**
- Community membership management
- Composite unique: (user_id, community_id)
- Role tracking: member, moderator, admin
- Timestamps: joined_at, left_at

#### 7. **sessions**
- User authentication sessions
- Token (unique), IP address, user agent, expiration, revoked flag
- Indexes: User ID, token (unique), expiration

#### 8. **audit_log**
- Complete audit trail
- User action, resource type/ID, details (JSONB), IP address
- Indexes: User ID, action, creation timestamp (covering)

#### 9. **notifications**
- User notifications
- Type, title, message, data (JSONB), read status with timestamp
- Indexes: User ID, is_read, creation timestamp

#### 10. **verifications**
- Bill expert verification tracking
- Bill ID, expert ID, verification status, confidence score (NUMERIC)
- Analysis text, flags (JSONB)

---

## Rollback (if needed)

### Drop All Tables and Enums

```bash
psql -U postgres -d simpletool -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
"
```

Then run migration again:

```bash
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql
```

---

## Troubleshooting

### Issue: "psql: could not translate host name"

**Cause**: PostgreSQL not running or connection refused

**Solution**:
```bash
# Start PostgreSQL (Windows)
# Services → PostgreSQL → Start

# Or start service
net start postgresql-x64-15

# Test connection
psql -U postgres -c "SELECT 1"
```

### Issue: "FATAL: password authentication failed"

**Cause**: Wrong password

**Solution**:
```bash
# Use correct credentials
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql

# Or set PGPASSWORD
export PGPASSWORD=your_password
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql
```

### Issue: "database 'simpletool' does not exist"

**Cause**: Database not created

**Solution**:
```bash
# Create database
psql -U postgres -c "CREATE DATABASE simpletool WITH ENCODING 'UTF8';"

# Then run migration
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql
```

### Issue: Migration shows "ERROR: duplicate key value violates unique constraint"

**Cause**: Tables already exist (partial migration)

**Solution**:
```bash
# Drop everything and start fresh
psql -U postgres -d simpletool -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
"

# Re-run migration
psql -U postgres -d simpletool < drizzle/0001_create_foundation_tables.sql
```

### Issue: "permission denied for schema public"

**Cause**: User doesn't have permissions

**Solution**:
```bash
# Grant permissions to postgres user
psql -U postgres -c "
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
"
```

---

## Post-Migration Steps

### 1. **Update Environment Variables**

Ensure `.env.local` has correct database URL:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/simpletool
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simpletool
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. **Clear Browser Cache**

If dev server shows stale data:

```bash
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Safari: Develop → Empty Web Storage

# Or clear IndexedDB for localhost:5173
```

### 3. **Start Dev Server**

```bash
cd client
npm run dev
# or
pnpm dev
```

### 4. **Run Tests**

```bash
npm test
# or
pnpm test
```

---

## Performance Optimization

The migration includes optimized indexes for common queries:

### Partial Indexes (Filter optimization)
- `idx_users_role_active`: Fast filtering by role where is_active=true
- `idx_users_county_active`: County-based active user queries
- `idx_users_last_login`: Recent login tracking

### Covering Indexes (Full scan reduction)
- `idx_comments_created_at`: Sorting comments by date without table lookup
- `idx_audit_log_created_at`: Audit log timeline queries

### Foreign Key Indexes
- All FK columns indexed for JOIN performance
- Cascade deletes properly configured

### Query Planning

To see index usage:

```bash
psql -U postgres -d simpletool -c "
  EXPLAIN ANALYZE 
  SELECT * FROM users WHERE is_active=true AND role='legislator';
"
```

---

## Next Steps

1. ✅ Run migration
2. ✅ Verify schema with verification script
3. ✅ Clear browser cache
4. ✅ Restart dev server
5. ✅ Run integration tests
6. ✅ Monitor performance
7. 🔄 Consider adding test data seed script (optional)

---

## Additional Resources

- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Schema Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify all prerequisites are met
3. Run the verification script to diagnose issues
4. Check PostgreSQL logs: `pg_dump -v`

---

**Migration Status**: Ready to execute ✅
**Last Updated**: $(date)
**Schema Version**: 1 (Foundation)
