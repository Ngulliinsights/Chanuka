# Phase 2: Integration Guide - Complete Setup Instructions

**Status**: Phase 2 Files Ready for Integration  
**Last Updated**: January 8, 2026

---

## Quick Start (3 Steps)

### Step 1: Add to App Startup

```typescript
// In your main.ts or server.ts
import { initializePhase2Sync } from '@/shared/database/graph/app-init';

async function startApp() {
  // ... existing initialization ...

  // Initialize Phase 2: PostgreSQL Triggers + Auto-Sync
  await initializePhase2Sync();

  // ... rest of app setup ...
}

startApp().catch(console.error);
```

### Step 2: Add Graceful Shutdown

```typescript
// Handle application shutdown
process.on('SIGTERM', async () => {
  await shutdownPhase2Sync();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownPhase2Sync();
  process.exit(0);
});
```

### Step 3: Add Monitoring Endpoint (Optional)

```typescript
import { registerSyncRoutes } from '@/shared/database/graph/sync-monitoring';

// Register monitoring endpoints
registerSyncRoutes(app); // For Express.js

// OR for Fastify:
// registerSyncRoutesFastify(fastify);
```

**Done!** Your app now has automatic synchronization.

---

## Configuration

### Environment Variables

Set these in your `.env` or deployment configuration:

```bash
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# Sync Behavior
SYNC_INTERVAL_MS=300000        # Sync every 5 minutes
SYNC_BATCH_SIZE=100            # Process 100 entities per batch
SYNC_TIMEOUT_MS=30000          # 30 second timeout per entity
ENABLE_AUTO_SYNC=true          # Start scheduler automatically
```

### Custom Configuration

```typescript
import { initializePhase2Sync } from '@/shared/database/graph/app-init';

await initializePhase2Sync({
  neo4jUri: 'bolt://my-neo4j-server:7687',
  syncIntervalMs: 2 * 60 * 1000,  // Every 2 minutes
  batchSizeLimit: 250,            // Larger batches
  enableAutoSync: true,
});
```

---

## Monitoring

### Check Sync Status

```typescript
import { getSyncServiceStatus } from '@/shared/database/graph/sync-executor';

const status = await getSyncServiceStatus();
console.log({
  initialized: status.initialized,
  neo4jConnected: status.neo4jConnected,
  pendingEntities: status.pendingEntities,
  failedEntities: status.failedEntities,
  conflictCount: status.conflictCount,
});
```

### REST API Endpoints

Once monitoring routes are registered, you can check status:

```bash
# Check sync status
curl http://localhost:3000/api/sync/status

# Get health report
curl http://localhost:3000/api/sync/health

# Get formatted status (human-readable)
curl http://localhost:3000/api/sync/formatted-status

# Manually trigger sync
curl -X POST http://localhost:3000/api/sync/trigger

# Trigger sync and wait for completion
curl -X POST http://localhost:3000/api/sync/trigger-and-wait

# List conflicting entities
curl http://localhost:3000/api/sync/conflicts

# Detect conflicts for specific entity
curl http://localhost:3000/api/sync/conflicts/User/550e8400-e29b-41d4-a716-446655440000

# Resolve conflict (PostgreSQL wins)
curl -X POST http://localhost:3000/api/sync/conflicts/User/550e8400-e29b-41d4-a716-446655440000/resolve
```

### Watch Sync Status in Code

```typescript
import { watchSyncStatus } from '@/shared/database/graph/app-init';

// Watch and log sync status every 30 seconds
const watchInterval = watchSyncStatus(30000);

// Later, stop watching:
stopWatchingSyncStatus(watchInterval);
```

---

## Complete Integration Examples

### Express.js

```typescript
import express from 'express';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from '@/shared/database/graph/app-init';
import { registerSyncRoutes } from '@/shared/database/graph/sync-monitoring';

const app = express();

// Initialize on startup
app.listen(3000, async () => {
  try {
    await initializePhase2Sync();
    console.log('Server running on port 3000');
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
});

// Register monitoring endpoints
registerSyncRoutes(app);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await shutdownPhase2Sync();
  process.exit(0);
});
```

### NestJS

```typescript
// sync.module.ts
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from '@/shared/database/graph/app-init';
import { SyncController } from './sync.controller';

@Module({
  controllers: [SyncController],
})
export class SyncModule implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('Initializing Phase 2 sync...');
    await initializePhase2Sync();
  }

  async onModuleDestroy() {
    console.log('Shutting down Phase 2 sync...');
    await shutdownPhase2Sync();
  }
}

// sync.controller.ts
import { Controller, Get, Post, Param } from '@nestjs/common';
import { getSyncServiceStatus, triggerFullSync } from '@/shared/database/graph/sync-executor';

@Controller('api/sync')
export class SyncController {
  @Get('status')
  async getStatus() {
    return getSyncServiceStatus();
  }

  @Post('trigger')
  async trigger() {
    return triggerFullSync();
  }
}
```

### Fastify

```typescript
import Fastify from 'fastify';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from '@/shared/database/graph/app-init';
import { registerSyncRoutesFastify } from '@/shared/database/graph/sync-monitoring';

const fastify = Fastify({ logger: true });

// Initialize on startup
fastify.addHook('onReady', async () => {
  console.log('Initializing Phase 2 sync...');
  await initializePhase2Sync();
});

// Register monitoring endpoints
registerSyncRoutesFastify(fastify);

// Graceful shutdown
fastify.addHook('onClose', async () => {
  console.log('Shutting down Phase 2 sync...');
  await shutdownPhase2Sync();
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server running at ${address}`);
});
```

---

## Troubleshooting

### Issue: "Sync service not initialized"

**Cause**: `initializePhase2Sync()` wasn't called

**Fix**:
```typescript
// Make sure this runs on app startup
await initializePhase2Sync();
```

### Issue: "Neo4j connection failed"

**Cause**: Neo4j server not reachable or credentials wrong

**Check**:
```bash
# Test Neo4j connection
curl neo4j://neo4j:password@localhost:7687

# Verify environment variables
echo $NEO4J_URI
echo $NEO4J_USER
echo $NEO4J_PASSWORD
```

**Fix**:
- Ensure Neo4j is running
- Update environment variables
- Check network connectivity
- Verify firewall/security groups allow connection

### Issue: Pending entities not decreasing

**Cause**: Sync batch runner not executing

**Check**:
```typescript
const status = await getSyncServiceStatus();
console.log(status.pendingEntities); // Should decrease over time
```

**Fix**:
- Verify `enableAutoSync: true` in config
- Check application logs for errors
- Manually trigger: `await triggerFullSync()`
- Verify Neo4j is connected

### Issue: High failure rate

**Check**:
```sql
-- View recent errors
SELECT entity_type, attempt_number, failure_message, created_at
FROM graph_sync_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Common causes**:
- Timeout (increase `syncTimeoutMs`)
- Constraint violations (check Neo4j schema)
- Missing entities (verify PostgreSQL data exists)
- Network issues (check connectivity)

**Fix**:
```typescript
// Increase timeout
await initializePhase2Sync({
  syncTimeoutMs: 60000, // 60 seconds
});

// Or manually resolve conflicts
const conflicts = await checkSyncHealth();
if (conflicts.issues.length > 0) {
  // Address issues per recommendations
}
```

---

## Performance Tuning

### Increase Throughput

```typescript
await initializePhase2Sync({
  syncIntervalMs: 2 * 60 * 1000,  // Sync every 2 minutes
  batchSizeLimit: 500,             // Larger batches
  syncTimeoutMs: 60000,            // 60 second timeout
});
```

### Monitor Performance

```sql
-- Average sync time per entity type
SELECT entity_type, COUNT(*) as count, AVG(duration_seconds) as avg_duration
FROM graph_sync_batches
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type
ORDER BY avg_duration DESC;

-- Slowest syncs
SELECT batch_name, batch_type, duration_seconds, synced_entities
FROM graph_sync_batches
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY duration_seconds DESC
LIMIT 20;
```

---

## Data Consistency Verification

### Check for Conflicts

```typescript
import { verifyDataConsistency, detectConflicts } from '@/shared/database/graph/sync-executor';

// Overall consistency
const report = await verifyDataConsistency();
console.log(`Conflicts: ${report.conflictCount}`);
console.log(`Stale data: ${report.inconsistencies.staleData}`);

// Specific entity
const conflict = await detectConflicts('User', '550e8400-...');
if (conflict.hasConflict) {
  console.log('Conflicting fields:', conflict.conflictingFields);
  console.log('PostgreSQL:', conflict.postgresValues);
  console.log('Neo4j:', conflict.neo4jValues);
}
```

### Resolve Conflicts

```typescript
import { resolveConflict } from '@/shared/database/graph/sync-executor';

// PostgreSQL wins (data is re-synced from PostgreSQL)
await resolveConflict('User', '550e8400-...');
```

---

## Monitoring SQL Queries

### Useful Queries

```sql
-- Current sync status
SELECT 
  sync_status,
  COUNT(*) as count,
  MAX(last_synced_at) as last_sync,
  MAX(sync_attempts) as max_attempts
FROM graph_sync_status
GROUP BY sync_status
ORDER BY count DESC;

-- Entities pending sync
SELECT entity_type, COUNT(*) as count
FROM graph_sync_status
WHERE sync_status = 'pending'
GROUP BY entity_type
ORDER BY count DESC;

-- Failed syncs
SELECT entity_type, COUNT(*) as count
FROM graph_sync_status
WHERE sync_status = 'failed'
GROUP BY entity_type
ORDER BY count DESC;

-- Batch history
SELECT 
  batch_type,
  batch_status,
  COUNT(*) as count,
  AVG(duration_seconds) as avg_duration,
  MAX(created_at) as latest
FROM graph_sync_batches
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY batch_type, batch_status
ORDER BY latest DESC;

-- Stale data (>24h without sync)
SELECT 
  entity_type,
  COUNT(*) as count,
  MIN(last_synced_at) as oldest_sync
FROM graph_sync_status
WHERE sync_status = 'synced'
  AND last_synced_at < NOW() - INTERVAL '24 hours'
GROUP BY entity_type
ORDER BY oldest_sync;
```

---

## Next: Phase 3

After Phase 2 is stable (see success criteria), proceed to Phase 3:

- [ ] User engagement graph (Comments, votes, bookmarks)
- [ ] Advanced recommendation engine
- [ ] Bidirectional sync (Neo4j → PostgreSQL)
- [ ] Conflict resolution strategies

See `PHASE_3_ENGAGEMENT_GRAPH_PLAN.md` for details.

---

## Files Reference

| File | Purpose |
|------|---------|
| `sync-triggers.ts` | PostgreSQL trigger definitions (auto-queues changes) |
| `batch-sync-runner.ts` | Polling executor (processes pending entities) |
| `sync-executor.ts` | High-level orchestration & conflict detection |
| `app-init.ts` | One-line setup for application integration |
| `sync-monitoring.ts` | REST API endpoints for monitoring |
| `graph/index.ts` | Public API exports |

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review application logs (`sync-executor.ts` logs details)
3. Check SQL queries on sync tracking tables
4. Refer to `PHASE_2_TRIGGER_SYNC_GUIDE.md` for architecture details

---

**Status**: Ready for Integration ✅  
**Next Step**: Integrate into application startup
