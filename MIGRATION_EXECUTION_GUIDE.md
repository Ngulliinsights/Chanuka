# Migration Execution Guide

## Quick Start

```bash
# 1. Review the plan
cat FRESH_START_MIGRATION_PLAN.md

# 2. Execute the migration (interactive mode)
npm run db:fresh-start

# 3. Or run in automated mode (use with caution!)
npm run db:fresh-start -- --auto

# 4. Or dry-run to see what would happen
npm run db:fresh-start -- --dry-run
```

---

## What This Migration Does

### Tables Included (109 total)

**Core Tables (85):**
- Foundation: users, bills, sponsors, committees, etc.
- Citizen Participation: comments, votes, engagement, notifications
- Parliamentary Process: amendments, versions, votes, hearings
- Constitutional Intelligence: provisions, analyses, precedents
- Argument Intelligence: arguments, claims, evidence, briefs
- Platform Operations: data sources, sync jobs, analytics
- Integration Monitoring: features, metrics, health checks, alerts
- Integrity Operations: moderation, verification, audit logs
- Safeguards: rate limits, content flags, reputation, security
- Feature Flags: flags, evaluations, metrics

**Strategic Tables (24):**
- Universal Access: USSD sessions, ambassadors, offline submissions
- Advocacy Coordination: campaigns, actions, participants, impact
- Transparency: financial disclosures, conflicts, influence networks

### Tables Deferred (56 total)

**Why Deferred:**
- No feature code exists yet
- No immediate business need
- Can be added incrementally later
- Reduces initial complexity

**Deferred Domains:**
- Impact Measurement (12 tables)
- Expert Verification (6 tables)
- Advanced Discovery (6 tables)
- Real-Time Engagement (8 tables)
- Market Intelligence (5 tables)
- Political Economy (4 tables)
- Accountability Ledger (3 tables)
- Trojan Bill Detection (4 tables)
- Search System (3 tables)
- Constitutional Intelligence Advanced (5 tables)

---

## Pre-Migration Checklist

### ✅ Before You Start

- [ ] Read FRESH_START_MIGRATION_PLAN.md completely
- [ ] Understand what tables will be created
- [ ] Know which features will be enabled
- [ ] Schedule maintenance window (3 hours recommended)
- [ ] Notify stakeholders of downtime
- [ ] Ensure DATABASE_URL is set correctly
- [ ] Have database credentials ready
- [ ] Backup any critical data manually if needed

### ⚠️ Important Warnings

1. **This will DELETE ALL DATA** - The database will be reset completely
2. **Downtime Required** - Application will be unavailable during migration
3. **No Rollback** - Once data is deleted, only backup can restore it
4. **Test First** - Run on staging/development before production

---

## Execution Steps

### Interactive Mode (Recommended)

```bash
npm run db:fresh-start
```

**What happens:**
1. Preflight checks (DATABASE_URL, drizzle.config.ts)
2. Creates backup (saved to ./backups/)
3. Asks for confirmation before reset
4. Resets database (drops all tables)
5. Generates fresh migration from schema
6. Shows migration summary
7. Asks for confirmation before applying
8. Applies migration
9. Verifies database state
10. Optionally seeds data
11. Optionally runs tests

**Prompts you'll see:**
- "This will DELETE ALL DATA. Continue?" → Type `yes`
- "Review migration file and confirm" → Type `yes`
- "Seed database with initial data?" → Type `yes` or `no`
- "Run integration tests?" → Type `yes` or `no`

### Automated Mode (Use with Caution)

```bash
npm run db:fresh-start -- --auto
```

**What's different:**
- No prompts - all confirmations auto-accepted
- Faster execution
- Use only if you're confident
- Recommended for CI/CD pipelines

### Dry Run Mode (Safe Testing)

```bash
npm run db:fresh-start -- --dry-run
```

**What happens:**
- Shows what would be executed
- No actual changes made
- No database modifications
- Safe to run anytime

---

## What Gets Created

### Database Objects

**Tables:** ~109 tables
- Foundation tables
- Participation tables
- Parliamentary process tables
- Intelligence tables
- Operations tables
- Security tables
- Strategic feature tables

**Enums:** ~25 enum types
- user_role, bill_status, chamber, party
- moderation_status, verification_level
- notification_type, engagement_type
- And 17 more...

**Indexes:** ~200+ indexes
- Primary keys
- Foreign keys
- Unique constraints
- Performance indexes
- Partial indexes

**Foreign Keys:** ~150+ relationships
- User → Profile
- Bill → Sponsor
- Comment → User, Bill
- And many more...

---

## Post-Migration Verification

### Automatic Checks

The script automatically verifies:
- ✅ Migration applied successfully
- ✅ Database health check passes
- ✅ Expected table count

### Manual Verification

**1. Check Table Count:**
```bash
npm run db:studio
# Should see ~109 tables
```

**2. Test Core Features:**
```bash
# Start the application
npm run dev

# Test in browser:
# - User registration/login
# - View bills
# - Add comments
# - Check notifications
```

**3. Test Strategic Features:**
```bash
# Test USSD service
curl -X POST http://localhost:3000/api/ussd/session

# Test campaign creation
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Campaign"}'
```

**4. Check Logs:**
```bash
# Monitor for errors
tail -f logs/app.log

# Should see no database errors
```

---

## Troubleshooting

### Migration Fails at Step 3 (Reset)

**Problem:** Database reset fails

**Solution:**
```bash
# Manual reset
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then retry
npm run db:fresh-start
```

### Migration Fails at Step 4 (Generate)

**Problem:** Migration generation fails

**Solution:**
```bash
# Check drizzle.config.ts is correct
cat drizzle.config.ts

# Verify schema files exist
ls server/infrastructure/schema/*.ts

# Try manual generation
npx drizzle-kit generate:pg
```

### Migration Fails at Step 6 (Apply)

**Problem:** Migration application fails

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check migration file
cat drizzle/[latest].sql

# Try manual application
psql $DATABASE_URL < drizzle/[latest].sql
```

### Wrong Table Count

**Problem:** Expected 109 tables, got different number

**Solution:**
```bash
# Check which schema files are in drizzle.config.ts
grep "schema:" drizzle.config.ts -A 30

# Verify all expected files are listed
# Should see 24 schema files

# If missing, update drizzle.config.ts and regenerate
npm run db:generate
npm run db:migrate
```

### Features Not Working

**Problem:** USSD/Campaigns/Monitoring not working

**Solution:**
```bash
# Verify tables exist
psql $DATABASE_URL -c "\dt" | grep -E "(ussd|campaign|integration)"

# Should see:
# - ussd_sessions
# - campaigns
# - integration_features
# - etc.

# If missing, check drizzle.config.ts includes:
# - universal_access.ts
# - advocacy_coordination.ts
# - integration_monitoring.ts
```

---

## Rollback Procedures

### Option 1: Restore from Backup

```bash
# Find your backup
ls -lh backups/

# Restore
psql $DATABASE_URL < backups/backup_[timestamp].sql

# Verify
npm run db:health
```

### Option 2: Revert Migration

```bash
# If migration was applied but has issues
npm run db:rollback

# Or rollback to specific point
npm run db:rollback --to=[migration_id]
```

### Option 3: Start Over

```bash
# Reset and try again
npm run db:reset:force
npm run db:migrate
```

---

## Adding Deferred Tables Later

### When You're Ready

**Example: Adding Impact Measurement**

```typescript
// 1. Edit drizzle.config.ts
// Uncomment this line:
"./server/infrastructure/schema/impact_measurement.ts",

// 2. Generate incremental migration
npm run db:generate

// 3. Review migration
cat drizzle/[timestamp]_add_impact_measurement.sql

// 4. Apply migration
npm run db:migrate

// 5. Verify
npm run db:verify-alignment
```

### Recommended Addition Order

**Q2 2026:** Impact Measurement (12 tables)
- Enables donor reporting
- Proves platform effectiveness

**Q3 2026:** Advanced Features (20 tables)
- Expert Verification
- Advanced Discovery
- Real-Time Engagement

**Q4 2026:** Research Features (16 tables)
- Market Intelligence
- Political Economy
- Accountability Ledger
- Trojan Bill Detection

---

## Success Criteria

### Migration is Successful When:

✅ Script completes without errors  
✅ ~109 tables exist in database  
✅ All foreign keys are valid  
✅ Migration journal is updated  
✅ Application starts without errors  
✅ Core features work (login, bills, comments)  
✅ Strategic features work (USSD, campaigns)  
✅ No database errors in logs  
✅ Integration tests pass  

---

## Timeline

| Step | Duration | Cumulative |
|------|----------|------------|
| Preflight checks | 2 min | 2 min |
| Create backup | 5 min | 7 min |
| Reset database | 2 min | 9 min |
| Generate migration | 10 min | 19 min |
| Review migration | 5 min | 24 min |
| Apply migration | 5 min | 29 min |
| Verify database | 10 min | 39 min |
| Seed data | 30 min | 69 min |
| Run tests | 30 min | 99 min |
| **Total** | **~1.5-2 hours** | |

*Note: Seeding and testing are optional and can be skipped*

---

## Support

### If You Need Help

1. **Check logs:** `tail -f logs/app.log`
2. **Review this guide:** Troubleshooting section
3. **Check backup:** Restore if needed
4. **Contact team:** Share error messages

### Common Issues

- **"DATABASE_URL not set"** → Check .env file
- **"Migration failed"** → Check database connection
- **"Wrong table count"** → Check drizzle.config.ts
- **"Features not working"** → Verify tables exist

---

## Post-Migration Tasks

### Immediate (Day 1)

- [ ] Verify all features work
- [ ] Monitor logs for errors
- [ ] Test critical user flows
- [ ] Update team on completion

### Short-term (Week 1)

- [ ] Update ARCHITECTURE.md
- [ ] Document new features enabled
- [ ] Train team on new capabilities
- [ ] Monitor performance metrics

### Long-term (Month 1)

- [ ] Plan for deferred features
- [ ] Schedule next migration
- [ ] Review and optimize queries
- [ ] Update user documentation

---

## Key Files

- `drizzle.config.ts` - Schema configuration (UPDATED)
- `FRESH_START_MIGRATION_PLAN.md` - Detailed plan
- `scripts/database/fresh-start-migration.ts` - Execution script
- `backups/` - Database backups
- `drizzle/` - Migration files

---

**Last Updated:** February 25, 2026  
**Status:** Ready for execution  
**Estimated Time:** 1.5-2 hours  
**Risk Level:** Low (with backup)  
**Impact:** High (enables all strategic features)
