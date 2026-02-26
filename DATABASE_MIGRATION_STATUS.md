# Database Migration Status

## Current Migration State

Based on the migration journal (`drizzle/meta/_journal.json`), the following migrations have been applied:

1. **20260225131859_fancy_maverick** - Applied on 2026-02-25
2. **20260225133920_brief_killraven** - Applied on 2026-02-25 (constraint fix)

## Tables Currently in Database

Based on the migration files and schema analysis, the following tables **ARE** currently migrated:

### Foundation Domain
- ✓ `users`
- ✓ `user_profiles`
- ✓ `bills`
- ✓ `sponsors`
- ✓ `committees`
- ✓ `committee_members`
- ✓ `governors`

### Citizen Participation
- ✓ `comments`
- ✓ `comment_votes`
- ✓ `bill_engagement`
- ✓ `bill_votes`
- ✓ `notifications`
- ✓ `alert_preferences`
- ✓ `sessions`

### Expert Verification (from latest migration)
- ✓ `expert_credentials`
- ✓ `expert_domains`
- ✓ `expert_activity`
- ✓ `expert_reviews`
- ✓ `credibility_scores`
- ✓ `peer_validations`
- ✓ `expert_moderator_eligibility`

### Constitutional Intelligence
- ✓ `constitutional_provisions`
- ✓ `constitutional_analyses`
- ✓ `legal_precedents`
- ✓ `expert_review_queue`

### Parliamentary Process
- ✓ `parliamentary_sessions`
- ✓ `parliamentary_sittings`
- ✓ `bill_readings`
- ✓ `bill_amendments`
- ✓ `bill_versions`
- ✓ `parliamentary_votes`
- ✓ `public_participation_events`
- ✓ `public_submissions`

## Tables NOT Yet Migrated

The following tables are defined in schemas but **NOT** yet in the database:

### Trojan Bill Detection ❌
- ✗ `trojan_bill_analysis`
- ✗ `hidden_provisions`
- ✗ `trojan_techniques`
- ✗ `detection_signals`

### Argument Intelligence ❌
- ✗ `arguments`
- ✗ `claims`
- ✗ `evidence`
- ✗ `argument_relationships`
- ✗ `legislative_briefs`
- ✗ `synthesis_jobs`

### Advocacy Coordination ❌
- ✗ `campaigns`
- ✗ `action_items`
- ✗ `campaign_participants`
- ✗ `action_completions`
- ✗ `campaign_impact_metrics`
- ✗ `coalition_relationships`

### Universal Access ❌
- ✗ `ambassadors`
- ✗ `communities`
- ✗ `facilitation_sessions`
- ✗ `offline_submissions`
- ✗ `ussd_sessions`
- ✗ `localized_content`
- ✗ `assistive_technology_compatibility`
- ✗ `accessibility_features`
- ✗ `accessibility_audits`
- ✗ `accessibility_feedback`
- ✗ `inclusive_design_metrics`
- ✗ `user_accessibility_preferences`

## Required Actions

### 1. Enable Trojan Bill Detection Schema
**Status**: ✓ COMPLETED

The schema has been uncommented in `drizzle.config.ts`:
```typescript
"./server/infrastructure/schema/trojan_bill_detection.ts",
```

### 2. Generate Migration
**Status**: ⏳ PENDING

Run the following command to generate a migration for all missing tables:

```bash
npm run db:generate
```

This will create a new migration file in the `drizzle/` directory that includes:
- Trojan Bill Detection tables (4 tables)
- Argument Intelligence tables (6 tables)  
- Advocacy Coordination tables (6 tables)
- Universal Access tables (12+ tables)

### 3. Apply Migration
**Status**: ⏳ PENDING

After generating the migration, apply it:

```bash
npm run db:migrate
```

### 4. Verify Migration
**Status**: ⏳ PENDING

Verify all tables were created:

```bash
npm run db:studio
```

Or check the database directly:

```bash
npm run db:health
```

### 5. Run Seeds
**Status**: ⏳ PENDING

After migration is complete:

```bash
# Primary seed (foundation data)
npm run db:seed:primary

# Secondary seed (advanced modules)
npm run db:seed:secondary
```

## Schema Configuration Status

### Currently Enabled in drizzle.config.ts:
- ✓ Foundation
- ✓ Citizen Participation
- ✓ Participation Oversight
- ✓ Parliamentary Process
- ✓ Constitutional Intelligence
- ✓ Argument Intelligence
- ✓ Transparency Intelligence
- ✓ Platform Operations
- ✓ Safeguards
- ✓ Expert Verification
- ✓ Feature Flags
- ✓ Universal Access
- ✓ Advocacy Coordination
- ✓ Search System
- ✓ Advanced Discovery
- ✓ WebSocket
- ✓ **Trojan Bill Detection** (newly enabled)

### Not Yet Enabled:
- ✗ Impact Measurement
- ✗ Real-time Engagement
- ✗ Market Intelligence
- ✗ Political Economy
- ✗ Accountability Ledger
- ✗ Constitutional Compliance
- ✗ Graph Sync

## Summary

**Tables in Database**: ~50+ tables (Foundation, Participation, Parliamentary, Constitutional, Expert Verification)

**Tables Pending Migration**: ~28 tables (Trojan Detection, Argument Intelligence, Advocacy, Universal Access)

**Next Step**: Run `npm run db:generate` to create migration for the 28 pending tables.

## Verification Commands

```bash
# Check migration status
cat drizzle/meta/_journal.json

# List all tables in database
psql $DATABASE_URL -c "\dt"

# Count tables
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Check specific table exists
psql $DATABASE_URL -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trojan_bill_analysis');"
```

---

**Last Updated**: 2026-02-25
**Migration Status**: Trojan Bill Detection schema enabled, migration pending
