# Database Infrastructure Migration Guide

## Overview

This guide helps you migrate from the old fragmented database system to the new unified database infrastructure. The new system consolidates the best features from both `shared/database/connection.ts` and `server/infrastructure/database/connection-pool.ts`.

## What Changed

### Before (Fragmented System)
```
shared/database/connection.ts          # Simple API, basic features
server/infrastructure/database/        # Advanced features, complex setup
scripts/database/                      # 15+ scattered scripts
```

### After (Unified System)
```
shared/database/core/                  # All core functionality
server/infrastructure/database/        # Production-specific extensions
scripts/database/                      # 5 essential scripts
```

## Migration Steps

### Step 1: Update Imports

**Old imports:**
```typescript
// From shared/database
import { database, withTransaction, checkDatabaseHealth } from '@shared/database';

// From server infrastructure
import { DatabaseConnectionPool } from '@server/infrastructure/database/connection-pool';
```

**New imports:**
```typescript
// Unified system (recommended)
import { initializeDatabase, getConnectionManager } from '@shared/database';

// Or backward compatible (works but not recommended)
import { database, withTransaction, checkDatabaseHealth } from '@shared/database';
```

### Step 2: Initialize the System

**Old way (multiple initialization points):**
```typescript
// In shared/database/connection.ts
const database = drizzle(pool);

// In server/infrastructure/database/connection-pool.ts
const connectionPool = new DatabaseConnectionPool(config);
```

**New way (single initialization):**
```typescript
// In your application startup
import { initializeDatabase } from '@shared/database';

const { connectionManager, healthMonitor } = await initializeDatabase({
  max: 20,
  readReplicaUrls: process.env.DB_READ_REPLICAS?.split(','),
  operationalDbUrl: process.env.DB_OPERATIONAL_URL,
  analyticsDbUrl: process.env.DB_ANALYTICS_URL,
  securityDbUrl: process.env.DB_SECURITY_URL,
});

// Health monitoring starts automatically
```

### Step 3: Update Database Usage

**Old way:**
```typescript
// Simple operations
const users = await database.select().from(usersTable);

// Transactions
await withTransaction(async (tx) => {
  await tx.insert(usersTable).values(newUser);
});

// Advanced pooling (server only)
const pool = new DatabaseConnectionPool(config);
const client = await pool.getReadConnection();
```

**New way:**
```typescript
// Simple operations (backward compatible)
const users = await database.select().from(usersTable);

// Or explicit routing (recommended)
const connectionManager = getConnectionManager();
const readDb = connectionManager.getDatabase('read');
const users = await readDb.select().from(usersTable);

// Transactions (enhanced with retry logic)
await withTransaction(async (tx) => {
  await tx.insert(usersTable).values(newUser);
}, {
  maxRetries: 3,
  timeout: 5000
});

// Specialized databases
const analyticsDb = connectionManager.getAnalyticsDb();
const metrics = await analyticsDb.select().from(metricsTable);
```

### Step 4: Update Health Monitoring

**Old way:**
```typescript
// Basic health check
const health = await checkDatabaseHealth();

// Advanced monitoring (server only)
const monitoring = new DatabaseMonitoring(pool);
await monitoring.performHealthCheck();
```

**New way:**
```typescript
// Comprehensive health monitoring
const healthMonitor = getHealthMonitor();
const results = await healthMonitor.performHealthCheck();
const summary = healthMonitor.getHealthSummary();

// Custom alerts
healthMonitor.addAlertRule({
  name: 'custom_latency_alert',
  condition: (metrics, result) => result.latencyMs > 2000,
  severity: 'high',
  message: 'Custom latency threshold exceeded',
  cooldownMs: 5 * 60 * 1000
});
```

## Environment Configuration

### Old Environment Variables
```bash
# Multiple different variable names across systems
DATABASE_URL=postgresql://...
DB_CONNECTION_STRING=postgresql://...
POSTGRES_URL=postgresql://...
```

### New Unified Environment Variables
```bash
# Core connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chanuka_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Pool configuration
DB_POOL_MIN=2
DB_POOL_MAX=20

# Timeouts
DB_CONNECTION_TIMEOUT=5000
DB_QUERY_TIMEOUT=30000

# Read replicas
DB_READ_REPLICA_URLS=postgresql://read1.example.com/db,postgresql://read2.example.com/db

# Multi-database architecture
DB_OPERATIONAL_URL=postgresql://operational.example.com/db
DB_ANALYTICS_URL=postgresql://analytics.example.com/db
DB_SECURITY_URL=postgresql://security.example.com/db

# Health monitoring
DB_HEALTH_CHECK_INTERVAL=30000
DB_MAX_RETRIES=3
```

## Common Migration Patterns

### Pattern 1: Basic Database Operations

**Before:**
```typescript
import { database } from '@shared/database';

export async function getActiveUsers() {
  return await database.select()
    .from(usersTable)
    .where(eq(usersTable.active, true));
}
```

**After (Backward Compatible):**
```typescript
import { database } from '@shared/database';

export async function getActiveUsers() {
  // This still works! The unified system provides backward compatibility
  return await database.select()
    .from(usersTable)
    .where(eq(usersTable.active, true));
}
```

**After (Recommended):**
```typescript
import { getConnectionManager } from '@shared/database';

export async function getActiveUsers() {
  const db = getConnectionManager().getDatabase('read');
  return await db.select()
    .from(usersTable)
    .where(eq(usersTable.active, true));
}
```

### Pattern 2: Transaction Management

**Before:**
```typescript
import { withTransaction } from '@shared/database';

export async function createUserWithProfile(userData: any, profileData: any) {
  return await withTransaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values(userData).returning();
    await tx.insert(profilesTable).values({ ...profileData, userId: user.id });
    return user;
  });
}
```

**After (Enhanced):**
```typescript
import { withTransaction } from '@shared/database';

export async function createUserWithProfile(userData: any, profileData: any) {
  return await withTransaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values(userData).returning();
    await tx.insert(profilesTable).values({ ...profileData, userId: user.id });
    return user;
  }, {
    maxRetries: 3,
    timeout: 10000,
    onError: (error, attempt) => {
      console.log(`Transaction attempt ${attempt} failed:`, error.message);
    }
  });
}
```

### Pattern 3: Health Monitoring

**Before:**
```typescript
import { checkDatabaseHealth } from '@shared/database';

export async function healthEndpoint() {
  const health = await checkDatabaseHealth();
  return { status: health.overall ? 'ok' : 'error' };
}
```

**After (Enhanced):**
```typescript
import { getHealthMonitor } from '@shared/database';

export async function healthEndpoint() {
  const healthMonitor = getHealthMonitor();
  const summary = healthMonitor.getHealthSummary();
  
  return {
    status: summary.status,
    uptime: summary.uptime,
    activeAlerts: summary.activeAlerts,
    metrics: summary.metrics
  };
}
```

## Application Startup Changes

### Before (Multiple Initialization Points)
```typescript
// In different files across the codebase
import { pool } from '@shared/database';
import { DatabaseConnectionPool } from '@server/infrastructure/database';

// Scattered initialization
const connectionPool = new DatabaseConnectionPool(config);
```

### After (Single Initialization Point)
```typescript
// In your main application file (e.g., server/src/index.ts)
import { initializeDatabase, shutdownDatabase } from '@shared/database';

async function startApplication() {
  // Initialize database system
  const { connectionManager, healthMonitor } = await initializeDatabase({
    max: process.env.NODE_ENV === 'production' ? 50 : 10,
    readReplicaUrls: process.env.DB_READ_REPLICAS?.split(','),
  });

  // Your application setup...
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await shutdownDatabase();
    process.exit(0);
  });
}

startApplication().catch(console.error);
```

## Testing Changes

### Before (Multiple Test Setups)
```typescript
// Different test setups in different files
import { database } from '@shared/database';
import { DatabaseConnectionPool } from '@server/infrastructure/database';
```

### After (Unified Test Setup)
```typescript
// In your test setup file
import { quickSetup, shutdownDatabase } from '@shared/database';

beforeAll(async () => {
  await quickSetup('test');
});

afterAll(async () => {
  await shutdownDatabase();
});
```

## Breaking Changes

### None for Basic Usage
The unified system maintains full backward compatibility for basic database operations. Your existing code should continue to work without changes.

### Advanced Features Require Updates
If you were using advanced features from `server/infrastructure/database/connection-pool.ts`, you'll need to update to the new API:

**Before:**
```typescript
const pool = new DatabaseConnectionPool(config);
const metrics = pool.getMetrics();
```

**After:**
```typescript
const connectionManager = getConnectionManager();
const metrics = connectionManager.getMetrics();
```

## Benefits of Migration

### 1. **Simplified Architecture**
- Single source of truth for database logic
- Consistent API across all environments
- Reduced cognitive load for developers

### 2. **Enhanced Features**
- Intelligent read/write routing
- Advanced health monitoring with alerts
- Multi-database support for scaling
- Comprehensive metrics collection

### 3. **Better Performance**
- Optimized connection pooling
- Automatic replica routing for reads
- Connection health monitoring
- Query performance tracking

### 4. **Improved Reliability**
- Unified error handling
- Automatic retry logic for transient failures
- Comprehensive health checks
- Graceful degradation

## Rollback Plan

If you need to rollback to the old system:

1. **Revert imports** to use the old modules directly
2. **Update initialization** to use the old patterns
3. **Remove unified system** initialization calls

The old files are preserved during the migration, so rollback is straightforward.

## Support and Troubleshooting

### Common Issues

**Issue: "Connection manager not initialized"**
```typescript
// Solution: Initialize the database system first
await initializeDatabase();
```

**Issue: Legacy connections not working**
```typescript
// Solution: The legacy layer is initialized automatically
// Just make sure you've called initializeDatabase()
```

**Issue: Environment variables not recognized**
```typescript
// Solution: Check the new environment variable names
// See DATABASE_ENV_VARS export for the complete list
```

### Getting Help

1. Check the comprehensive logging output
2. Use the health monitoring dashboard
3. Review the configuration validation errors
4. Consult the type definitions for API guidance

## Next Steps

1. **Test the migration** in your development environment
2. **Update your application** startup code
3. **Verify health monitoring** is working
4. **Update your deployment** scripts
5. **Monitor performance** after migration

The unified system provides significant improvements while maintaining compatibility with your existing code.