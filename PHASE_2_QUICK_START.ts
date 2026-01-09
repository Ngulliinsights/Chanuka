// ============================================================================
// PHASE 2 QUICK START TEMPLATE
// ============================================================================
// Copy this code into your main.ts or server.ts for Phase 2 integration
// Provides complete setup with minimal configuration

/**
 * OPTION 1: Express.js
 *
 * Copy this entire block into your Express app setup
 */

import express from 'express';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from './shared/database/graph/app-init';
import { registerSyncRoutes } from './shared/database/graph/sync-monitoring';

const app = express();

// Initialize on startup
app.listen(3000, async () => {
  try {
    console.log('Starting application...');

    // PHASE 2: Initialize automatic sync
    await initializePhase2Sync();
    console.log('✅ Phase 2 sync initialized');

    // Optional: Register monitoring endpoints
    registerSyncRoutes(app);
    console.log('✅ Monitoring endpoints registered at /api/sync/*');

    console.log('✅ Application ready on port 3000');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await shutdownPhase2Sync();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Interrupted - shutting down...');
  await shutdownPhase2Sync();
  process.exit(0);
});

// ============================================================================

/**
 * OPTION 2: NestJS
 *
 * Add this module to your app.module.ts imports
 */

import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from './shared/database/graph/app-init';

@Module({
  // ... your other modules ...
})
export class SyncModule implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('🚀 Initializing Phase 2 sync module...');
    try {
      await initializePhase2Sync();
      console.log('✅ Phase 2 sync ready');
    } catch (error) {
      console.error('❌ Failed to initialize Phase 2:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    console.log('🛑 Shutting down Phase 2 sync...');
    await shutdownPhase2Sync();
  }
}

// ============================================================================

/**
 * OPTION 3: Fastify
 *
 * Copy into your Fastify setup
 */

import Fastify from 'fastify';
import {
  initializePhase2Sync,
  shutdownPhase2Sync,
} from './shared/database/graph/app-init';
import { registerSyncRoutesFastify } from './shared/database/graph/sync-monitoring';

async function start() {
  const fastify = Fastify({ logger: true });

  // Initialize Phase 2 on startup
  fastify.addHook('onReady', async () => {
    console.log('🚀 Initializing Phase 2 sync...');
    await initializePhase2Sync();
    console.log('✅ Phase 2 sync initialized');
  });

  // Register monitoring endpoints (optional)
  registerSyncRoutesFastify(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    console.log('🛑 Shutting down Phase 2 sync...');
    await shutdownPhase2Sync();
  });

  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('✅ Server running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

// ============================================================================

/**
 * OPTION 4: Custom Setup with Monitoring
 *
 * Use this if you need custom configuration
 */

import {
  initializePhase2Sync,
  shutdownPhase2Sync,
  watchSyncStatus,
  stopWatchingSyncStatus,
} from './shared/database/graph/app-init';

async function setupPhase2() {
  // Initialize with custom config
  await initializePhase2Sync({
    neo4jUri: process.env.NEO4J_URI,
    syncIntervalMs: 2 * 60 * 1000,  // 2 minutes
    batchSizeLimit: 250,
    enableAutoSync: true,
  });

  // Watch sync status (logs every 30 seconds)
  const watchInterval = watchSyncStatus(30000);

  // Later, stop watching:
  // stopWatchingSyncStatus(watchInterval);
}

setupPhase2();

// ============================================================================

/**
 * ENVIRONMENT VARIABLES
 *
 * Add these to your .env file
 */

/*
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# Sync Configuration (optional, defaults shown)
SYNC_INTERVAL_MS=300000        # 5 minutes
SYNC_BATCH_SIZE=100            # Entities per batch
SYNC_TIMEOUT_MS=30000          # 30 seconds per entity
ENABLE_AUTO_SYNC=true          # Start scheduler
*/

// ============================================================================

/**
 * TESTING SYNC
 *
 * Use these commands to verify Phase 2 is working
 */

import { getSyncServiceStatus, triggerFullSync } from './shared/database/graph/sync-executor';

// Check sync status
async function testSync() {
  const status = await getSyncServiceStatus();
  console.log('Sync Status:', {
    initialized: status.initialized,
    neo4jConnected: status.neo4jConnected,
    pendingEntities: status.pendingEntities,
    failedEntities: status.failedEntities,
    conflictCount: status.conflictCount,
  });

  // If pending entities, manually trigger sync
  if (status.pendingEntities > 0) {
    console.log('Triggering sync...');
    const stats = await triggerFullSync();
    console.log('Sync Results:', {
      synced: stats.syncedCount,
      failed: stats.failedCount,
      duration: `${Math.floor(stats.duration / 1000)}s`,
    });
  }
}

// testSync();

// ============================================================================

/**
 * API ENDPOINTS (if monitoring routes registered)
 *
 * Test these with curl or your HTTP client
 */

/*
# Check sync status
curl http://localhost:3000/api/sync/status

# Get health report
curl http://localhost:3000/api/sync/health

# Manually trigger sync
curl -X POST http://localhost:3000/api/sync/trigger

# Trigger and wait
curl -X POST http://localhost:3000/api/sync/trigger-and-wait

# Check conflicts
curl http://localhost:3000/api/sync/conflicts

# Resolve specific conflict (PostgreSQL wins)
curl -X POST "http://localhost:3000/api/sync/conflicts/User/550e8400-e29b-41d4-a716-446655440000/resolve"
*/

// ============================================================================

/**
 * MONITORING SQL QUERIES
 *
 * Run these in PostgreSQL to check sync status
 */

/*
-- Current sync status
SELECT
  sync_status,
  COUNT(*) as count,
  MAX(last_synced_at) as latest_sync
FROM graph_sync_status
GROUP BY sync_status;

-- Pending entities (should decrease over time)
SELECT entity_type, COUNT(*) as count
FROM graph_sync_status
WHERE sync_status = 'pending'
GROUP BY entity_type
ORDER BY count DESC;

-- Recent failures
SELECT entity_type, failure_message, COUNT(*) as count
FROM graph_sync_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY entity_type, failure_message
ORDER BY count DESC;

-- Batch statistics
SELECT batch_type, batch_status, COUNT(*) as count, AVG(duration_seconds) as avg_duration
FROM graph_sync_batches
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY batch_type, batch_status;

-- Entities with conflicts
SELECT entity_type, entity_id, conflict_details
FROM graph_sync_status
WHERE has_conflicts = true
LIMIT 10;
*/

// ============================================================================

/**
 * TROUBLESHOOTING CHECKLIST
 */

/*
❓ Sync not working?

1. Is initializePhase2Sync() called at startup?
   └─ Check logs for "Phase 2 sync initialized"

2. Is Neo4j connected?
   └─ Check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD environment variables
   └─ Verify Neo4j server is running: curl bolt://localhost:7687

3. Are triggers firing?
   └─ INSERT into users → check graph_sync_status for new 'pending' record
   └─ If not, run initializeSyncTriggers(db) manually

4. Is batch runner executing?
   └─ Check logs for "Batch sync" messages
   └─ Verify ENABLE_AUTO_SYNC=true
   └─ Manually trigger: await triggerFullSync()

5. Are there sync errors?
   └─ Query graph_sync_failures for error patterns
   └─ Check Neo4j logs for constraint violations
   └─ Increase SYNC_TIMEOUT_MS if timeouts

6. High pending count?
   └─ Increase SYNC_BATCH_SIZE and decrease SYNC_INTERVAL_MS
   └─ Check if batch runner is stuck (check last_synced_at)

Need help? See PHASE_2_INTEGRATION_GUIDE.md for detailed troubleshooting.
*/
