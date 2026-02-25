# Ready to Execute - Fresh Start Migration

## Status: ✅ READY (with one conflict to resolve)

**Date:** February 25, 2026  
**Estimated Time:** 2-3 hours  
**Risk Level:** Low (with backup)

---

## What's Been Done

### ✅ Completed

1. **Analysis Complete**
   - Identified 109 tables to include (85 core + 24 strategic)
   - Identified 56 tables to defer (future features)
   - Documented strategic value of all tables
   - Created comprehensive migration plan

2. **Configuration Updated**
   - ✅ `drizzle.config.ts` updated with 25 schema files
   - ✅ Includes all core and strategic tables
   - ✅ Future features commented out for later
   - ✅ Well-documented with sections

3. **Scripts Created**
   - ✅ `scripts/database/fresh-start-migration.ts` - Automated execution
   - ✅ Interactive mode with confirmations
   - ✅ Dry-run mode for testing
   - ✅ Automated mode for CI/CD

4. **Documentation Created**
   - ✅ `FRESH_START_MIGRATION_PLAN.md` - Detailed plan
   - ✅ `WHY_TABLES_ARE_UNUSED_ANALYSIS.md` - Strategic analysis
   - ✅ `SCHEMA_CONFLICTS_RESOLUTION.md` - Conflict documentation
   - ✅ `DATABASE_CONSISTENCY_ANALYSIS.md` - Current state analysis

---

## ⚠️ One Issue to Resolve First

### Schema Conflict: searchQueries Table

**Problem:** Two schemas define `searchQueries`:
- `search_system.ts` (included) ✅
- `advanced_discovery.ts` (not included) ❌

**Impact:**
- `SearchRepository.ts` will work ✅
- `SearchAnalytics.ts` will fail ❌

**Quick Fix (5 minutes):**
```bash
# Update SearchAnalytics to use search_system
# Edit: server/features/search/domain/SearchAnalytics.ts
# Line 3: Change from:
import { searchAnalytics, searchQueries } from '@server/infrastructure/schema/advanced_discovery';

# To:
import { searchAnalytics, searchQueries } from '@server/infrastructure/schema/search_system';
```

**Note:** `searchAnalytics` table is only in `advanced_discovery.ts`, so you may need to:
1. Keep the searchAnalytics import from advanced_discovery
2. Import searchQueries from search_system
3. Or temporarily comment out SearchAnalytics usage

**See:** `SCHEMA_CONFLICTS_RESOLUTION.md` for detailed options

---

## Execution Checklist

### Pre-Flight (5 minutes)

- [ ] Read `FRESH_START_MIGRATION_PLAN.md`
- [ ] Resolve searchQueries conflict (see above)
- [ ] Verify DATABASE_URL is set: `echo $DATABASE_URL`
- [ ] Ensure you have database access
- [ ] Schedule maintenance window (3 hours)
- [ ] Notify stakeholders of downtime

### Execution (2-3 hours)

```bash
# Option 1: Interactive mode (recommended)
npm run db:fresh-start

# Option 2: Dry run first (safe)
npm run db:fresh-start -- --dry-run

# Option 3: Automated (use with caution)
npm run db:fresh-start -- --auto
```

### Post-Migration (30 minutes)

- [ ] Verify table count (~109 tables)
- [ ] Test user authentication
- [ ] Test bill viewing
- [ ] Test comments
- [ ] Test USSD service
- [ ] Test campaign creation
- [ ] Check logs for errors
- [ ] Update documentation

---

## What Will Be Created

### Core Tables (85)

**Foundation (13 tables):**
- users, user_profiles, bills, sponsors
- governors, committees, committee_members
- parliamentary_sessions, parliamentary_sittings
- oauth_providers, oauth_tokens
- user_sessions, county_bill_assents

**Citizen Participation (10 tables):**
- sessions, comments, comment_votes
- bill_votes, bill_engagement, user_interests
- bill_tracking_preferences, notifications
- alert_preferences, user_contact_methods

**Parliamentary Process (9 tables):**
- bill_committee_assignments, bill_amendments
- bill_versions, bill_readings
- parliamentary_votes, bill_cosponsors
- public_participation_events, public_submissions
- public_hearings

**Constitutional Intelligence (5 tables):**
- constitutional_provisions, constitutional_analyses
- legal_precedents, expert_review_queue
- analysis_audit_trail

**Argument Intelligence (6 tables):**
- arguments, claims, evidence
- argument_relationships, legislative_briefs
- synthesis_jobs

**Platform Operations (10 tables):**
- data_sources, sync_jobs
- external_bill_references, analytics_events
- bill_impact_metrics, county_engagement_stats
- trending_analysis, user_engagement_summary
- platform_health_metrics, content_performance

**Integration Monitoring (6 tables):**
- integration_features, feature_metrics
- health_checks, integration_alerts
- alert_rules, integration_logs

**Integrity Operations (8 tables):**
- content_reports, moderation_queue
- expert_profiles, user_verification
- user_activity_log, audit_payloads
- system_audit_log, security_events

**Safeguards (14 tables):**
- rate_limits, rate_limit_config
- content_flags, moderation_decisions
- moderation_appeals, expert_moderator_eligibility
- cib_detections, behavioral_anomalies
- suspicious_activity_logs, reputation_scores
- reputation_history, identity_verification
- device_fingerprints

**Feature Flags (3 tables):**
- feature_flags, feature_flag_evaluations
- feature_flag_metrics

**Analysis (1 table):**
- analysis

### Strategic Tables (24)

**Universal Access (6 tables):**
- ambassadors, communities
- facilitation_sessions, offline_submissions
- ussd_sessions, localized_content

**Advocacy Coordination (6 tables):**
- campaigns, action_items
- campaign_participants, action_completions
- campaign_impact_metrics, coalition_relationships

**Transparency Intelligence (5 tables):**
- financial_disclosures, financial_interests
- conflict_detections, influence_networks
- implementation_workarounds

**Transparency Analysis (6 tables):**
- corporate_entities, lobbying_activities
- bill_financial_conflicts, cross_sector_ownership
- regulatory_capture_indicators

**Participation Oversight (1 table):**
- participation_quality_audits

**Search System (multiple tables):**
- content_embeddings, search_queries
- saved_searches, search_suggestions
- And more...

---

## What's Deferred (56 tables)

These will be added later when features are implemented:

- Impact Measurement (12 tables)
- Expert Verification (6 tables)
- Advanced Discovery (6 tables)
- Real-Time Engagement (8 tables)
- Market Intelligence (5 tables)
- Political Economy (4 tables)
- Accountability Ledger (3 tables)
- Trojan Bill Detection (4 tables)
- Constitutional Intelligence Advanced (5 tables)
- Search System Advanced (3 tables)

**Why Deferred:**
- No feature code exists yet
- No immediate business need
- Can be added incrementally
- Reduces initial complexity

---

## Features Enabled After Migration

### ✅ Will Work

1. **User Management**
   - Registration, login, profiles
   - Authentication, sessions
   - Verification, preferences

2. **Bill Tracking**
   - View bills, sponsors
   - Track bills, get notifications
   - Comment, vote, engage

3. **Parliamentary Process**
   - Committee assignments
   - Amendments, versions
   - Votes, hearings
   - Public participation

4. **Intelligence Features**
   - Constitutional analysis
   - Argument synthesis
   - Legal precedents
   - Legislative briefs

5. **Platform Operations**
   - Data synchronization
   - Integration monitoring
   - Health checks
   - Analytics

6. **Security & Moderation**
   - Content moderation
   - Rate limiting
   - User verification
   - Security events

7. **Strategic Features**
   - USSD access (feature phones)
   - Campaign coordination
   - Transparency tracking
   - Conflict detection

8. **Search**
   - Semantic search
   - Vector embeddings
   - Query tracking
   - Search analytics

### ⏸️ Won't Work Yet (Deferred)

- Impact measurement dashboards
- Expert verification system
- Advanced discovery patterns
- Real-time engagement leaderboards
- Market intelligence analysis
- Political economy tracking
- Accountability ledger
- Trojan bill detection

---

## Rollback Plan

### If Something Goes Wrong

**Option 1: Restore from Backup**
```bash
# Backup is created automatically
ls -lh backups/

# Restore
psql $DATABASE_URL < backups/backup_[timestamp].sql
```

**Option 2: Start Over**
```bash
npm run db:reset:force
npm run db:migrate
```

---

## Success Criteria

Migration is successful when:

✅ Script completes without errors  
✅ ~109 tables exist in database  
✅ All foreign keys are valid  
✅ Migration journal is updated  
✅ Application starts without errors  
✅ Users can login  
✅ Bills can be viewed  
✅ Comments can be posted  
✅ USSD service responds  
✅ Campaigns can be created  
✅ No database errors in logs  

---

## Next Steps

### 1. Resolve Conflict (5 minutes)

Fix the searchQueries conflict (see above)

### 2. Execute Migration (2-3 hours)

```bash
npm run db:fresh-start
```

### 3. Verify (30 minutes)

Test all critical features

### 4. Monitor (Ongoing)

Watch logs for any issues

### 5. Document (1 hour)

Update ARCHITECTURE.md with new structure

---

## Support

**If you need help:**
1. Check `SCHEMA_CONFLICTS_RESOLUTION.md`
2. Check `FRESH_START_MIGRATION_PLAN.md`
3. Review error messages carefully
4. Restore from backup if needed

**Common Issues:**
- "searchQueries conflict" → Fix SearchAnalytics import
- "DATABASE_URL not set" → Check .env file
- "Migration failed" → Check database connection
- "Wrong table count" → Verify drizzle.config.ts

---

## Files to Review

1. **`drizzle.config.ts`** - Schema configuration (UPDATED ✅)
2. **`FRESH_START_MIGRATION_PLAN.md`** - Detailed plan
3. **`SCHEMA_CONFLICTS_RESOLUTION.md`** - Conflict resolution
4. **`scripts/database/fresh-start-migration.ts`** - Execution script

---

**Status:** ✅ READY TO EXECUTE  
**Blocker:** ⚠️ Resolve searchQueries conflict first (5 min fix)  
**Timeline:** 2-3 hours total  
**Risk:** Low (with backup)  
**Impact:** High (enables all strategic features)

---

## Quick Start

```bash
# 1. Fix the conflict
# Edit: server/features/search/domain/SearchAnalytics.ts
# Update imports to use search_system

# 2. Run migration
npm run db:fresh-start

# 3. Follow prompts
# - Confirm backup
# - Confirm reset
# - Confirm migration
# - Optional: seed data
# - Optional: run tests

# 4. Verify
npm run db:studio
# Should see ~109 tables

# 5. Test
npm run dev
# Test login, bills, comments, USSD, campaigns
```

---

**Ready to proceed!** 🚀
