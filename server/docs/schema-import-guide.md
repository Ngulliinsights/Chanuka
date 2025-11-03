# Schema Import Migration Guide

## Overview

This guide documents the migration from the old schema structure to the new domain-organized schema architecture. All server imports have been updated to use the centralized schema exports.

## New Import Patterns

### ✅ Correct Import Patterns

```typescript
// ✅ Import tables and types from centralized schema
import { users, bills, sponsors, comments } from '@shared/schema';
import type { User, Bill, Sponsor, Comment } from '@shared/schema';

// ✅ Import database connections
import { database, operationalDb, analyticsDb } from '@shared/schema';

// ✅ Import all schema items
import * as schema from '@shared/schema';

// ✅ Import specific domain items
import { 
  // Foundation domain
  users, user_profiles, sponsors, committees, bills,
  
  // Citizen participation domain  
  sessions, comments, comment_votes, bill_votes,
  
  // Parliamentary process domain
  bill_amendments, bill_versions, parliamentary_votes
} from '@shared/schema';
```

### ❌ Old Import Patterns (Now Deprecated)

```typescript
// ❌ Old relative path imports
import { users } from '../../shared/schema/schema.js';
import { Bill } from '../../../shared/schema/schema.js';

// ❌ Old direct file imports
import * as schema from '../../../shared/schema';
import { database } from '../../shared/database/connection';
```

## Table Name Changes

The following table names have been updated in the new schema:

| Old Name | New Name | Domain |
|----------|----------|---------|
| `user_profiles` | `user_profiles` | Foundation |
| `comments` | `comments` | Citizen Participation |
| `notification` | `notifications` | Citizen Participation |
| `bill` | `bills` | Foundation |
| `sponsor` | `sponsors` | Foundation |
| `user_interest` | `user_interests` | Foundation |
| `verification` | `user_verification` | Integrity Operations |
| `expertVerifications` | `user_verification` | Integrity Operations |
| `citizenVerifications` | `user_verification` | Integrity Operations |
| `securityAuditLog` | `system_audit_log` | Integrity Operations |
| `content_report` | `content_reports` | Integrity Operations |
| `bill_sponsorship` | `bill_cosponsors` | Parliamentary Process |
| `sponsorAffiliation` | `sponsors` | Foundation |
| `userBillTrackingPreference` | `bill_tracking_preferences` | Citizen Participation |

## Domain Organization

The new schema is organized into the following domains:

### Foundation Schema
Core legislative entities and shared reference data:
- `users`, `user_profiles`
- `sponsors`, `committees`, `committee_members`
- `parliamentary_sessions`, `parliamentary_sittings`
- `bills`

### Citizen Participation Schema
Public-facing interaction layer:
- `sessions`, `comments`, `comment_votes`
- `bill_votes`, `bill_engagement`
- `bill_tracking_preferences`, `notifications`
- `alert_preferences`

### Parliamentary Process Schema
Legislative workflow and procedure tracking:
- `bill_committee_assignments`, `bill_amendments`
- `bill_versions`, `bill_readings`
- `parliamentary_votes`, `bill_cosponsors`
- `public_participation_events`, `public_submissions`

### Constitutional Intelligence Schema
Constitutional analysis and legal framework:
- `constitutional_provisions`, `constitutional_analyses`
- `legal_precedents`, `expert_review_queue`
- `analysis_audit_trail`

### Argument Intelligence Schema
Transform citizen input into structured knowledge:
- `arguments`, `claims`, `evidence`
- `argument_relationships`, `legislative_briefs`
- `synthesis_jobs`

### Advocacy Coordination Schema
Collective action and campaign infrastructure:
- `campaigns`, `action_items`
- `campaign_participants`, `action_completions`
- `campaign_impact_metrics`

### Universal Access Schema
Offline engagement and community facilitation:
- `ambassadors`, `communities`
- `facilitation_sessions`, `offline_submissions`
- `ussd_sessions`, `localized_content`

### Integrity Operations Schema
Content moderation and platform security:
- `content_reports`, `moderation_queue`
- `expert_profiles`, `user_verification`
- `user_activity_log`, `system_audit_log`
- `security_events`

### Platform Operations Schema
Analytics, metrics, and performance tracking:
- `data_sources`, `sync_jobs`
- `external_bill_references`, `analytics_events`
- `bill_impact_metrics`, `county_engagement_stats`
- `trending_analysis`

## Migration Checklist

### ✅ Completed Updates

- [x] Database service imports
- [x] WebSocket service imports
- [x] User feature imports
- [x] Notification service imports
- [x] Security service imports
- [x] Sponsor feature imports
- [x] Search service imports
- [x] Recommendation service imports
- [x] Infrastructure service imports
- [x] Test helper imports

### 🔄 Remaining Tasks

- [ ] Create validation schemas for new domain structure
- [ ] Update any remaining test files
- [ ] Verify all TypeScript compilation passes
- [ ] Update API documentation
- [ ] Test all functionality works with new imports

## Database Connection Updates

The new schema provides multiple database connection options:

```typescript
// Multi-database architecture (Phase One - all point to same instance)
import { 
  operationalDb,  // Primary operational database
  analyticsDb,    // Analytics database (same instance in Phase One)
  securityDb,     // Security database (same instance in Phase One)
  database as db, // Default export (operational)
  checkDatabaseHealth,
  closeDatabaseConnections
} from '@shared/schema';
```

## Type Safety

All imports now provide better type safety:

```typescript
// ✅ Strongly typed imports
import type { 
  User, Bill, Sponsor, Comment,
  InsertUser, InsertBill, InsertSponsor,
  BillStatus, UserRole, Chamber
} from '@shared/schema';

// ✅ Enum imports
import type {
  KenyanCounty, BillStatus, UserRole,
  VerificationStatus, ModerationStatus
} from '@shared/schema';
```

## Error Handling

If you encounter import errors after migration:

1. **Check the table name mapping** - Many tables have been renamed
2. **Verify the import path** - All imports should use `@shared/schema`
3. **Check for typos** - Table names are now consistent (no double 's' endings)
4. **Verify TypeScript compilation** - Run `npm run type-check` to catch issues

## Testing

After migration, run these commands to verify everything works:

```bash
# Type checking
npm run type-check

# Run tests
npm run test

# Start development server
npm run dev
```

## Support

If you encounter issues with the migration:

1. Check this guide for the correct import patterns
2. Verify table name mappings
3. Ensure you're using `@shared/schema` for all imports
4. Check the TypeScript compiler output for specific errors

## Future Considerations

This migration prepares the codebase for:

- **Phase Two**: True multi-database architecture with separate instances
- **Enhanced type safety** with domain-specific types
- **Better code organization** with clear domain boundaries
- **Improved maintainability** with centralized schema management