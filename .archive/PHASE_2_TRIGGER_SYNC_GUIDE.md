# Phase 2: Trigger-Based Synchronization Implementation Guide

**Date**: January 8, 2026  
**Status**: 🚀 PHASE 2 IN PROGRESS  
**Focus**: PostgreSQL triggers + Neo4j automatic sync

---

## Overview: What Phase 2 Accomplishes

Phase 2 automates the synchronization between PostgreSQL (source of truth) and Neo4j (read-optimized copy). Instead of manual batch syncs, PostgreSQL triggers automatically queue entities for sync whenever they change.

### Architecture

```
PostgreSQL                          Graph Sync Status Table              Neo4j
─────────────                      ──────────────────────              ──────
INSERT user                        ┌──────────────────────┐             
   ↓                              │ entity_type: 'User'  │──────sync───→ :User {id}
UPDATE bill.co_sponsors      →     │ entity_id: uuid      │              
   ↓                              │ sync_status: pending │              
DELETE argument                    │ created_at: now()    │              
   ↓                              └──────────────────────┘              
TRIGGER                                                                 
   ↓                                                                    
graph_sync_status.insert()                                             
```

**Key Features**:
- ✅ Automatic entity change detection
- ✅ Array field change tracking (co_sponsors, tags, etc.)
- ✅ Exponential backoff retry logic
- ✅ Conflict detection & resolution
- ✅ Comprehensive error logging
- ✅ Optional auto-sync scheduler

---

## Files Created (Phase 2)

### 1. **sync-triggers.ts** (CREATED)
PostgreSQL trigger definitions for automatic change detection.

**What it does**:
- Defines 3 trigger functions: `on_entity_change()`, `on_array_field_change()`, `on_entity_delete()`
- Creates 20+ triggers across users, sponsors, governors, bills, arguments, claims, sessions, sittings
- Provides `initializeSyncTriggers()` to activate all triggers on startup

**Key Functions**:
```typescript
// On any user/bill/argument INSERT/UPDATE → insert pending sync record
on_entity_change() {
  INSERT INTO graph_sync_status (entity_type, entity_id, sync_status='pending')
}

// On bill.co_sponsors/tags UPDATE → detect array changes
on_array_field_change() {
  IF OLD.co_sponsors != NEW.co_sponsors → mark 'pending' with changed_arrays metadata
}

// On DELETE → queue for orphan cleanup
on_entity_delete() {
  INSERT INTO graph_sync_status (sync_status='deleted')
}
```

**Usage**:
```typescript
import { initializeSyncTriggers } from './sync-triggers';

// In app startup
await initializeSyncTriggers(db);
```

**File Location**: `shared/schema/sync-triggers.ts` (380 lines)

---

### 2. **batch-sync-runner.ts** (CREATED)
Polling executor that processes pending sync operations from graph_sync_status table.

**What it does**:
- Polls graph_sync_status table for pending entities
- Executes sync functions for User, Person, Bill, Argument, Claim, etc.
- Tracks sync results (success/failure) with error codes
- Implements exponential backoff retry logic
- Records sync statistics in graph_sync_batches table

**Key Functions**:

```typescript
// Poll and sync up to 100 pending entities
runBatchSync(limit: 100, timeout: 30000): Promise<BatchSyncStats>

// Start recurring sync every 5 minutes
startSyncScheduler(intervalMs: 300000): void

// Stop auto-sync
stopSyncScheduler(): void
```

**Workflow**:
```
1. SELECT * FROM graph_sync_status WHERE sync_status='pending' LIMIT 100
2. FOR EACH entity:
   - Mark as 'in_progress'
   - Execute sync function (with timeout)
   - If success: mark 'synced', record timestamp
   - If fail: insert error record, mark 'failed' or 'pending' for retry
3. Record batch summary in graph_sync_batches
```

**Error Handling**:
- Timeout errors (>30s) → retryable
- Network errors → retryable with exponential backoff
- Constraint violations → non-retryable (requires manual fix)
- Max 3 attempts per entity (configurable)

**Usage**:
```typescript
import { runBatchSync, startSyncScheduler } from './batch-sync-runner';

// Manual sync
const stats = await runBatchSync();
console.log(`Synced: ${stats.syncedCount}/${stats.totalEntities}`);

// Auto sync every 5 minutes
startSyncScheduler();
```

**File Location**: `shared/database/graph/batch-sync-runner.ts` (450 lines)

---

### 3. **sync-executor.ts** (CREATED)
High-level orchestration of the entire sync ecosystem.

**What it does**:
- Initializes sync service (Neo4j connection, schema validation)
- Manages sync lifecycle (startup → running → shutdown)
- Provides conflict detection & resolution
- Monitors overall sync health

**Key Functions**:

```typescript
// Initialize on app startup
initializeSyncService(config): Promise<void>

// Get sync status
getSyncServiceStatus(): Promise<{
  initialized, 
  pendingEntities, 
  failedEntities, 
  conflictCount
}>

// Manual full sync
triggerFullSync(): Promise<BatchSyncStats>

// Verify data consistency between PostgreSQL and Neo4j
verifyDataConsistency(): Promise<ConsistencyReport>

// Detect conflicts (PostgreSQL vs Neo4j)
detectConflicts(entityType, entityId): Promise<ConflictReport>

// Resolve conflicts (PostgreSQL wins)
resolveConflict(entityType, entityId): Promise<void>
```

**Configuration**:
```typescript
const config = {
  neo4jUri: 'bolt://localhost:7687',
  neo4jUser: 'neo4j',
  neo4jPassword: 'password',
  syncIntervalMs: 5 * 60 * 1000,  // Every 5 minutes
  batchSizeLimit: 100,             // Sync up to 100 per batch
  syncTimeoutMs: 30000,            // 30 second timeout per entity
  enableAutoSync: true,            // Start scheduler immediately
};

await initializeSyncService(config);
```

**Usage**:
```typescript
import { initializeSyncService, getSyncServiceStatus } from './sync-executor';

// App startup
await initializeSyncService(config);

// Check status
const status = await getSyncServiceStatus();
console.log(`Pending: ${status.pendingEntities}`);
console.log(`Conflicts: ${status.conflictCount}`);

// App shutdown
await shutdownSyncService();
```

**File Location**: `shared/database/graph/sync-executor.ts` (380 lines)

---

## Implementation Checklist

### Phase 2.1: Activate Triggers ✅
- [x] Create sync-triggers.ts with all trigger definitions
- [ ] Run `initializeSyncTriggers(db)` during app startup
- [ ] Verify triggers created: `SELECT * FROM information_schema.triggers WHERE trigger_schema='public'`
- [ ] Test trigger: INSERT INTO users → verify graph_sync_status record created

### Phase 2.2: Implement Batch Sync ✅
- [x] Create batch-sync-runner.ts with polling executor
- [ ] Integrate into application (import runBatchSync)
- [ ] Test manual sync: `await runBatchSync()`
- [ ] Verify results in graph_sync_batches table

### Phase 2.3: Start Auto-Sync ✅
- [x] Create sync-executor.ts with orchestration logic
- [ ] Call `initializeSyncService(config)` on app startup
- [ ] Verify scheduler running: check logs for "Starting batch sync"
- [ ] Monitor graph_sync_status table for pending count decreasing

### Phase 2.4: Validation & Testing
- [ ] Unit tests for batch-sync-runner
- [ ] Integration tests for triggers
- [ ] Conflict detection tests
- [ ] Performance tests (measure sync latency)

### Phase 2.5: Monitoring & Alerts
- [ ] Add logging for sync health
- [ ] Set up alerts for: failed syncs > 10, conflicts detected, stale data > 1 hour
- [ ] Create dashboard: pending/synced/failed entity counts
- [ ] Track average sync latency per entity type

---

## Integration Steps (For App Setup)

### Step 1: Initialize Triggers (On App Startup)

```typescript
// In app initialization (e.g., main.ts, server.ts)

import { initializeSyncTriggers } from './shared/schema/sync-triggers';

async function initializeDatabase() {
  // ... existing migrations ...
  
  // Initialize sync triggers
  console.log('Setting up PostgreSQL sync triggers...');
  await initializeSyncTriggers(db);
  console.log('✅ Sync triggers initialized');
}
```

### Step 2: Initialize Sync Service (On App Startup)

```typescript
// In app initialization

import { initializeSyncService, shutdownSyncService } from './shared/database/graph/sync-executor';

const syncConfig = {
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
  syncIntervalMs: 5 * 60 * 1000,  // Every 5 minutes
  batchSizeLimit: 100,
  syncTimeoutMs: 30000,
  enableAutoSync: true,
};

await initializeSyncService(syncConfig);

// On graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownSyncService();
  process.exit(0);
});
```

### Step 3: Expose Sync Status Endpoint (Optional)

```typescript
// In Express/Fastify app

import { getSyncServiceStatus } from './shared/database/graph/sync-executor';

app.get('/api/sync/status', async (req, res) => {
  const status = await getSyncServiceStatus();
  res.json(status);
});
```

---

## Monitoring & Observability

### Check Sync Status

```typescript
const status = await getSyncServiceStatus();
console.log({
  initialized: status.initialized,
  neo4jConnected: status.neo4jConnected,
  pendingEntities: status.pendingEntities,
  failedEntities: status.failedEntities,
  conflictCount: status.conflictCount,
  lastSyncBatch: status.lastSyncBatch,
});
```

### Query Sync Status Table

```sql
-- Pending entities waiting for sync
SELECT entity_type, COUNT(*) as count
FROM graph_sync_status
WHERE sync_status = 'pending'
GROUP BY entity_type
ORDER BY count DESC;

-- Entities with conflicts
SELECT entity_type, entity_id, conflict_details
FROM graph_sync_status
WHERE has_conflicts = true;

-- Recent failures
SELECT entity_type, attempt_number, failure_message, created_at
FROM graph_sync_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- Batch statistics
SELECT batch_type, batch_status, AVG(duration_seconds) as avg_duration
FROM graph_sync_batches
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY batch_type, batch_status;
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Pending entities | < 10 | > 100 for 5 min |
| Failed entities | 0 | > 5 in 1 hour |
| Sync latency | < 1 sec | > 5 sec |
| Sync batch duration | < 30 sec | > 2 min |
| Conflict count | 0 | > 0 |
| Data staleness | < 1 hour | > 24 hours |

---

## Troubleshooting

### Issue: Pending Entities Not Decreasing

**Check**:
1. Is sync scheduler running?
   ```sql
   -- Should see recent entries in graph_sync_batches
   SELECT * FROM graph_sync_batches ORDER BY created_at DESC LIMIT 5;
   ```

2. Are there sync errors?
   ```sql
   -- Check failure log
   SELECT * FROM graph_sync_failures ORDER BY created_at DESC LIMIT 10;
   ```

3. Is Neo4j connected?
   ```typescript
   const status = await getSyncServiceStatus();
   console.log(status.neo4jConnected); // Should be true
   ```

**Fix**:
- Restart app to reinitialize sync service
- Check Neo4j connection logs
- Manual trigger: `await triggerFullSync()`

### Issue: Conflicts Detected

**Check**:
```typescript
const conflict = await detectConflicts('User', entityId);
console.log(conflict.conflictingFields); // Which fields differ?
console.log(conflict.postgresValues);   // PostgreSQL values
console.log(conflict.neo4jValues);      // Neo4j values
```

**Fix**:
```typescript
// PostgreSQL wins (resolve conflict)
await resolveConflict('User', entityId);
// This marks as 'pending' to re-sync from PostgreSQL
```

### Issue: Trigger Not Firing

**Check**:
```sql
-- Verify trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND trigger_name = 'users_sync_trigger';

-- Check trigger definition
SELECT trigger_body FROM information_schema.routines 
WHERE routine_name = 'on_entity_change';
```

**Fix**:
- Reinitialize triggers: `await initializeSyncTriggers(db)`
- Check PostgreSQL logs for trigger errors
- Verify table names in trigger function match actual tables

---

## Performance Tuning

### Increase Sync Throughput

```typescript
// Increase batch size and concurrency
await runBatchSync(
  250,    // Process 250 entities per batch (was 100)
  45000   // 45 second timeout per entity (was 30s)
);

// Sync more frequently
startSyncScheduler(2 * 60 * 1000); // Every 2 minutes (was 5)
```

### Monitor Sync Latency

```typescript
const stats = await runBatchSync();
const avgLatencyMs = stats.duration / stats.totalEntities;
console.log(`Average sync latency: ${avgLatencyMs}ms per entity`);
```

### Optimize Neo4j Queries

Ensure Neo4j has indexes (created by `initializeGraphSchema()`):
```cypher
-- Check indexes
SHOW INDEXES;

-- Should see indexes on: id, type, created_at, updated_at
```

---

## Next: Phase 3 (Weeks 4-6)

After Phase 2 is stable (no conflicts, sync latency < 1s), we'll implement Phase 3:

### Phase 3.1: User Engagement Graph
- Add Comment node to Neo4j
- Sync citizen_participation table (comments, votes, bookmarks)
- Create relationships: User -[AUTHORED]-> Comment, User -[VOTED]-> Bill

### Phase 3.2: Conflict Resolution Strategies
- Implement conflict detection with detailed field comparison
- Add manual review workflow
- Implement versioning/audit trail

### Phase 3.3: Advanced Monitoring
- Add dashboards (Grafana/DataDog)
- Set up alerts for anomalies
- Generate sync health reports

---

## References

- **sync-triggers.ts** - PostgreSQL trigger definitions (380 lines)
- **batch-sync-runner.ts** - Polling executor (450 lines)
- **sync-executor.ts** - High-level orchestration (380 lines)
- **graph_sync.ts** - Sync tracking tables schema (335 lines)
- **ENTITY_MAPPING_DOCUMENT.md** - Field mapping reference
- **PHASE_1_REMEDIATION_IMPLEMENTATION_COMPLETE.md** - Phase 1 summary

---

## Success Criteria for Phase 2

✅ Phase 2 is complete when:
- [ ] All 20+ triggers activated and firing
- [ ] Pending entities synced to Neo4j within 5 minutes of change
- [ ] <5 failed syncs in 24 hours
- [ ] Zero unresolved conflicts
- [ ] Average sync latency <1 second per entity
- [ ] Auto-sync scheduler running with <1% CPU overhead

---

**Status**: Phase 2 Implementation In Progress  
**Estimated Completion**: January 10-12, 2026  
**Next Review**: After trigger integration and first 24h stability test
