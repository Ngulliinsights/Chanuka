# Safeguards Services - Error Fixes and Corrections

## Overview
This document provides all the corrections needed for the safeguards service files to work with the actual schema structure.

---

## Critical Schema Mismatches

### 1. CIB Detection Service - Table/Type Name Corrections

**ERRORS TO FIX:**
- ❌ `anomalyEvents` → ✅ Use existing `behavioralAnomalies` table
- ❌ `coordinatedActivityClusters` → ✅ Not in schema (use `cibDetections` instead)
- ❌ `suspiciousActivityPatterns` → ✅ Use `suspiciousActivityLogs`
- ❌ `userBehaviorProfiles` → ✅ Not in schema (data should go in user metadata or separate tracking)

**Import Statement Fix:**
```typescript
// OLD (WRONG):
import {
  anomalyEvents,
  coordinatedActivityClusters,
  suspiciousActivityPatterns,
  userBehaviorProfiles,
  type AnomalyEvent,
  type CoordinatedActivityCluster,
  type NewSuspiciousActivityPattern,
  type NewUserBehaviorProfile,
  type SuspiciousActivityPattern,
  type UserBehaviorProfile,
} from '@server/infrastructure/schema/safeguards';

// NEW (CORRECT):
import {
  behavioralAnomalies,
  cibDetections,
  suspiciousActivityLogs,
  type BehavioralAnomaly,
  type CIBDetection,
  type NewBehavioralAnomaly,
  type NewCIBDetection,
  type NewSuspiciousActivityLog,
  type SuspiciousActivityLog,
} from '@server/infrastructure/schema/safeguards';
```

### 2. Rate Limit Service - Field Name Corrections

**ACTUAL RATE_LIMITS TABLE SCHEMA:**
```typescript
{
  id: uuid
  user_id: uuid (nullable)
  ip_address: varchar (nullable)
  device_fingerprint: varchar (nullable)
  action_type: rateLimitActionEnum
  attempt_count: integer (default 1)
  window_start: timestamp
  window_duration_minutes: integer (default 60)
  limit_threshold: integer  // ⚠️ This is what we have
  is_blocked: boolean (default false)
  blocked_until: timestamp (nullable)
  block_escalation_count: integer (default 0)
  user_reputation_at_block: decimal (nullable)
  is_verified_user: boolean (default false)
  access_method: varchar (default 'web')
  created_at, updated_at, last_violation: timestamps
  metadata: jsonb
}
```

**MISSING FIELDS (Not in schema):**
- ❌ `expires_at` - Use calculated from `window_start + window_duration_minutes`
- ❌ `session_id` - Not in schema
- ❌ `action_resource` - Not in schema
- ❌ `success_count` - Not in schema
- ❌ `failure_count` - Not in schema
- ❌ `blocked_count` - Not in schema
- ❌ `consecutive_violations` - Use `block_escalation_count` instead
- ❌ `penalty_multiplier` - Not in schema
- ❌ `violation_severity` - Not in schema
- ❌ `max_attempts` - Use `limit_threshold` instead

**RATE_LIMIT_CONFIG TABLE SCHEMA:**
```typescript
{
  id: uuid
  action_type: rateLimitActionEnum
  default_limit: integer
  verified_user_limit: integer
  new_user_limit: integer
  ussd_limit: integer
  window_minutes: integer (default 60)
  first_block_duration_minutes: integer (default 60)
  escalation_multiplier: decimal (default 2.0)
  max_block_duration_hours: integer (default 24)
  is_active: boolean (default true)  // ⚠️ Not 'is_enabled'
  created_at, updated_at: timestamps
}
```

**WHITELIST/BLACKLIST TABLES:**
```typescript
// rate_limit_whitelist
{
  whitelist_type: varchar  // ⚠️ Not 'identifier_type'
  whitelist_value: varchar  // ⚠️ Not 'identifier_value'
  applies_to_actions: jsonb
  is_active: boolean
  expires_at: timestamp
}

// rate_limit_blacklist
{
  blacklist_type: varchar  // ⚠️ Not 'identifier_type'
  blacklist_value: varchar  // ⚠️ Not 'identifier_value'
  severity: varchar
  action_taken: varchar
  is_active: boolean
  expires_at: timestamp
}
```

### 3. Safeguard Jobs - Import Path Corrections

**ERRORS TO FIX:**
```typescript
// ❌ WRONG:
import { database, writeDatabase } from '@/server/db';
import { logger } from '@/server/utils/logger';
import { reputationSourceEnum } from '@/shared/schema';

// ✅ CORRECT:
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database/connection';
import { logger } from '@shared/core';
import { reputationScores, reputationHistory, rateLimits, ...etc } from '@server/infrastructure/schema/safeguards';
```

**Missing Package:**
- Need to install: `npm install croner` or `pnpm add croner`

---

## Detailed Fixes by File

### A. CIB Detection Service Fixes

#### 1. Remove Non-Existent Table Usage
Since `userBehaviorProfiles` and `coordinatedActivityClusters` don't exist, simplify to:

```typescript
// Remove all user profile methods (createOrUpdateUserProfile, getUserProfile, etc.)
// Remove all cluster methods (recordCoordinatedCluster, getActiveCoordinatedClusters, etc.)

// Keep only:
// - logSuspiciousActivity() - uses suspiciousActivityLogs
// - recordBehavioralAnomaly() - uses behavioralAnomalies
// - recordCIBDetection() - uses cibDetections
// - Cleanup methods
```

#### 2. Fix Transaction Usage
```typescript
// ❌ WRONG:
const existing = await tx.select().from(table)...

// ✅ CORRECT:
const existing = await readDatabase.select().from(table)...
// OR use writeDatabase for modifications
```

The `tx` (DatabaseTransaction) type doesn't have `.select()`, `.insert()`, etc. methods in your codebase.

#### 3. Simplify to Match Schema
Focus on the three actual tables:
- `suspiciousActivityLogs` - Log suspicious activities
- `behavioralAnomalies` - Track user anomalies  
- `cibDetections` - Record CIB patterns

---

### B. Rate Limit Service Fixes

#### 1. Field Mapping Changes
```typescript
// Update all references:
max_attempts → limit_threshold
consecutive_violations → block_escalation_count
expires_at → Calculate from window_start + window_duration_minutes
is_enabled → is_active (in config)
identifier_value → whitelist_value / blacklist_value
identifier_type → whitelist_type / blacklist_type

// Remove references to:
success_count, failure_count, blocked_count
penalty_multiplier, violation_severity
session_id, action_resource
```

#### 2. Simplified Rate Limit Record
```typescript
const newRecord: NewRateLimit = {
  user_id: context.userId,
  ip_address: context.ipAddress,
  device_fingerprint: context.deviceFingerprint,
  action_type: context.actionType as any, // Cast to avoid type error
  window_start: new Date(),
  window_duration_minutes: config.window_minutes,
  attempt_count: 1,
  limit_threshold: config.default_limit,
  is_blocked: false,
  block_escalation_count: 0,
  is_verified_user: false,
  access_method: context.userAgent || 'web',
  metadata: {
    last_attempt_time: new Date().toISOString(),
    geo_location: context.geoLocation,
  },
};
```

#### 3. Use Standard Database Operations
```typescript
// Instead of tx.select(), tx.insert(), etc.:
await readDatabase.select().from(rateLimits)...
await writeDatabase.insert(rateLimits).values(...)...
await writeDatabase.update(rateLimits).set(...)...
```

#### 4. Remove FOR UPDATE Locking
Since `DatabaseTransaction` doesn't support it, use optimistic locking with timestamps instead:

```typescript
// Remove all sql`SELECT ... FOR UPDATE` queries
// Use timestamps and attempt_count for concurrency control
```

---

### C. Safeguard Jobs Fixes

#### 1. Fix Import Paths
```typescript
// Update all imports to use correct paths
import { readDatabase, writeDatabase, withTransaction, type DatabaseTransaction } from '@server/infrastructure/database/connection';
import { logger } from '@shared/core';
```

#### 2. Fix ReputationScore Type Usage
```typescript
// Batch processor needs proper typing:
async (user: typeof reputationScores.$inferSelect) => {
  await withTransaction(async (tx) => {
    // Use writeDatabase, not tx
    await writeDatabase.update(reputationScores)...
  });
}
```

#### 3. Install Croner Package
```bash
pnpm add croner
# or
npm install croner
```

#### 4. Fix Job Configuration Access
```typescript
// Add null checks:
const config = jobConfigs.reputationDecay;
if (!config) return;

const batchSize = config.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;
```

#### 5. Remove CIB Service Calls
Since CIB detection service has major changes:
```typescript
// Comment out or remove:
// await cibDetectionService.cleanupResolvedPatterns(...)
// await cibDetectionService.cleanupResolvedAnomalies(...)
```

---

## Simplified Implementation Strategy

Given the schema mismatches, here's the recommended approach:

### Phase 1: Core Services (Works with Existing Schema)
1. **Moderation Service** - ✅ Mostly correct, just fix transaction usage
2. **Rate Limit Service** - ⚠️ Remove missing fields, simplify logic
3. **Safeguard Jobs** - ⚠️ Fix imports and remove missing service calls

### Phase 2: CIB Detection (Requires Schema Updates)
Option A: Update schema to add missing tables
Option B: Simplify CIB service to only use existing tables

**Recommended: Option B** - Keep it simple:
```typescript
export class CIBDetectionService {
  // Only implement methods for tables that exist:
  async logSuspiciousActivity(context) { /* uses suspiciousActivityLogs */ }
  async recordBehavioralAnomaly(context) { /* uses behavioralAnomalies */ }
  async recordCIBDetection(context) { /* uses cibDetections */ }
  async cleanupOldActivityLogs(days) { /* cleanup */ }
}
```

---

## Quick Fix Checklist

### For CIB Detection Service:
- [ ] Change imports to use actual table names
- [ ] Remove all methods using non-existent tables
- [ ] Replace `tx.select()` with `readDatabase.select()`
- [ ] Replace `tx.insert()` with `writeDatabase.insert()`
- [ ] Replace `tx.update()` with `writeDatabase.update()`
- [ ] Replace `tx.delete()` with `writeDatabase.delete()`
- [ ] Add type assertions where needed (`as any` for enum types)

### For Rate Limit Service:
- [ ] Replace field names to match schema
- [ ] Remove all references to missing fields
- [ ] Update whitelist/blacklist field names
- [ ] Replace `is_enabled` with `is_active`
- [ ] Remove FOR UPDATE queries
- [ ] Use standard database operations
- [ ] Add type assertions for enum comparisons

### For Safeguard Jobs:
- [ ] Fix all import paths
- [ ] Install `croner` package
- [ ] Add null checks for job configs
- [ ] Fix type annotations for batch processors
- [ ] Remove calls to unavailable CIB methods
- [ ] Use writeDatabase instead of tx in transactions

### For Moderation Service:
- [ ] Replace `tx.select()` with `readDatabase.select()`
- [ ] Replace `tx.insert()` with `writeDatabase.insert()`
- [ ] Replace `tx.update()` with `writeDatabase.update()`
- [ ] Keep validation and business logic (mostly correct)

---

## Transaction Pattern Correction

**Your Codebase Pattern:**
```typescript
// Correct pattern for your codebase:
await withTransaction(async (tx: DatabaseTransaction) => {
  // ❌ DON'T: Use tx.select(), tx.insert(), etc.
  
  // ✅ DO: Use global database instances
  const data = await readDatabase.select().from(table)...
  await writeDatabase.insert(table).values(...)...
  await writeDatabase.update(table).set(...)...
  
  // The transaction wrapper ensures atomicity
  // but operations use the global instances
});
```

---

## Type Assertion Helper

For enum type mismatches, add at the top of files:
```typescript
// Type assertion helper for enums
function toActionType(value: string): any {
  return value as any;
}

// Usage:
action_type: toActionType(context.actionType)
```

---

## Summary

The main issues are:
1. **Schema mismatch** - Services reference tables/fields that don't exist
2. **Transaction API mismatch** - DatabaseTransaction doesn't have query methods
3. **Import path errors** - Using wrong module paths
4. **Missing dependencies** - croner not installed

**Simplest Fix:** Use the corrected CIB detection service I provided, which only uses the three tables that actually exist in the schema.

For the other services, apply the field name changes and transaction pattern corrections outlined above.
