# Database Driver Strategy & Configuration

**Clarifies the database driver selection and usage across the Chanuka platform**

---

## 🎯 Executive Summary

The Chanuka platform uses a **dual-driver strategy** based on environment:

| Environment | Driver | Reason | Status |
|---|---|---|---|
| **Production** | `@neondatabase/serverless` | Edge computing + serverless | ✅ Primary |
| **Staging** | `@neondatabase/serverless` | Same as production | ✅ Primary |
| **Development** | `pg` (node-postgres) | Local PostgreSQL | ✅ Local |
| **Testing** | `pg` (node-postgres) | Local test DB | ✅ Testing |

**Key Insight**: Use `@neondatabase/serverless` when `DATABASE_URL` points to Neon. Otherwise use `pg`.

---

## 📦 Driver Comparison

### Primary Driver: `@neondatabase/serverless`

**Use Case**: Neon (serverless PostgreSQL) environments  
**Environments**: Production, Staging  
**Driver**: TCP connection pool optimized for serverless  
**WebSocket Support**: Yes (required for Neon)

**Installation**:
```bash
npm install @neondatabase/serverless
```

**Usage**:
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

**Characteristics**:
- ✅ Works with Neon serverless PostgreSQL
- ✅ Handles connection pooling for serverless
- ✅ WebSocket support for persistent connections
- ✅ Optimized for edge computing
- ⚠️ Requires specific config for WebSockets

---

### Secondary Driver: `pg` (node-postgres)

**Use Case**: Traditional PostgreSQL databases  
**Environments**: Development, Testing, Local  
**Driver**: Native Node.js PostgreSQL driver  
**WebSocket Support**: No (not needed)

**Installation**:
```bash
npm install pg
```

**Usage**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

**Characteristics**:
- ✅ Works with any PostgreSQL database
- ✅ Simpler configuration
- ✅ Better for local development
- ✅ Standard node-postgres interface
- ⚠️ Not optimized for serverless

---

## ⚙️ Implementation Strategy

### Automatic Driver Selection

**Environment Detection**:
```typescript
/**
 * Automatically select appropriate driver based on environment
 */
function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Detect Neon (production/staging)
  if (databaseUrl.includes('neon.tech') || process.env.NEON_DATABASE === 'true') {
    return 'neon';  // Use @neondatabase/serverless
  }
  
  // Default to pg (development/testing)
  return 'pg';
}
```

**Current Configuration Files**:

1. **Production** (`server/infrastructure/database/pool-config.ts`):
```typescript
export function getProductionConfig() {
  return {
    driver: '@neondatabase/serverless',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    enableKeepAlive: true,
  };
}
```

2. **Development** (same file, different environment):
```typescript
export function getDevelopmentConfig() {
  return {
    driver: 'pg',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}
```

---

## 🔧 Configuration by Environment

### Production Configuration

**Database**: Neon (serverless PostgreSQL)  
**Driver**: `@neondatabase/serverless`  
**Settings**:
```typescript
{
  max: 20,                           // Higher pool size for prod
  idleTimeoutMillis: 30000,          // 30 sec idle timeout
  connectionTimeoutMillis: 10000,    // 10 sec connection timeout
  enableKeepAlive: true,             // Keep connections alive
  application_name: 'chanuka-prod',  // Connection identification
}
```

**Connection String Format**:
```
postgresql://user:password@host.neon.tech/database?sslmode=require
```

---

### Staging Configuration

**Database**: Neon (serverless PostgreSQL)  
**Driver**: `@neondatabase/serverless`  
**Settings**:
```typescript
{
  max: 15,                            // Medium pool size
  idleTimeoutMillis: 30000,           // 30 sec idle timeout
  connectionTimeoutMillis: 10000,     // 10 sec connection timeout
  enableKeepAlive: true,              // Keep connections alive
  application_name: 'chanuka-staging',
}
```

---

### Development Configuration

**Database**: Local PostgreSQL  
**Driver**: `pg`  
**Settings**:
```typescript
{
  max: 5,                             // Lower pool size for dev
  idleTimeoutMillis: 30000,           // 30 sec idle timeout
  connectionTimeoutMillis: 10000,     // 10 sec connection timeout
  application_name: 'chanuka-dev',
}
```

**Connection String Format**:
```
postgresql://postgres:password@localhost:5432/chanuka_dev
```

---

### Testing Configuration

**Database**: Local PostgreSQL (test database)  
**Driver**: `pg`  
**Settings**:
```typescript
{
  max: 3,                             // Minimal pool for tests
  idleTimeoutMillis: 5000,            // Short idle timeout
  connectionTimeoutMillis: 5000,      // Short connection timeout
  application_name: 'chanuka-test',
}
```

**Connection String Format**:
```
postgresql://postgres:password@localhost:5432/chanuka_test
```

---

## 📋 Environment Variables

### Required

```bash
# Database connection string (auto-detects Neon vs pg)
DATABASE_URL=postgresql://user:password@host/database

# Optional: Explicit driver selection
DATABASE_DRIVER=neon  # or 'pg'

# Optional: Neon-specific
NEON_DATABASE=true
```

### Optional

```bash
# Connection pool settings
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000

# Logging
DATABASE_LOG_LEVEL=info
DATABASE_TRACE_QUERIES=false
```

---

## 🔄 Migration: Adding New Environment

### If Adding Cloud Provider (e.g., Neon)

1. **Install driver**:
```bash
npm install @neondatabase/serverless
```

2. **Update pool config**:
```typescript
// server/infrastructure/database/pool-config.ts
export function getCloudConfig() {
  return {
    driver: '@neondatabase/serverless',
    webSocketConstructor: ws,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}
```

3. **Update environment detection**:
```typescript
function selectDriver() {
  if (databaseUrl.includes('neon.tech')) {
    return 'neon';
  }
  // ... other providers
  return 'pg';
}
```

4. **Test connection**:
```bash
npm run db:health
```

---

## 🎯 Best Practices

### 1. Use Environment-Based Configuration
❌ **Don't hardcode driver**:
```typescript
const pool = new Pool(...);  // Which driver?
```

✅ **Do use configuration**:
```typescript
const config = getConfigForEnvironment();
const pool = new Pool(config);
```

---

### 2. Handle Driver Differences
❌ **Don't write driver-specific code**:
```typescript
if (driver === 'neon') {
  // Neon-specific logic
} else {
  // pg-specific logic
}
```

✅ **Do use consistent interface**:
```typescript
// Both drivers implement same Pool interface
const result = await pool.query(sql);
```

---

### 3. Test Locally with pg

✅ **Local development**:
```bash
# Use local PostgreSQL
DATABASE_URL=postgresql://localhost/chanuka_dev npm run dev
```

⚠️ **Don't test serverless features locally**:
```bash
# WebSocket features won't work with local pg
npm run db:health  # Check actual database
```

---

### 4. Validate in Staging

Before production deployment:
```bash
# Test with actual Neon database
npm run db:health --detailed
npm run db:verify-alignment
npm run db:validate-migration
```

---

## 🐛 Troubleshooting

### Connection Issues

**Symptom**: `Error: connect ECONNREFUSED` (local development)

**Solution**:
```bash
# Check DATABASE_URL points to local PostgreSQL
echo $DATABASE_URL

# Should be something like:
# postgresql://postgres:password@localhost:5432/chanuka_dev

# Check PostgreSQL is running
psql -c "SELECT version();"

# If not running:
# macOS with Homebrew
brew services start postgresql

# Linux with systemd
sudo systemctl start postgresql

# Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -d postgres
```

---

### Neon Connection Issues (Production/Staging)

**Symptom**: `Error: SSL error during handshake`

**Solution**:
```bash
# Verify Neon credentials
echo $DATABASE_URL

# Should include:
# - neon.tech in hostname
# - ?sslmode=require at end

# Check WebSocket support is configured
# In pool-config.ts:
neonConfig.webSocketConstructor = ws;

# Verify firewall allows outbound connections
```

---

### Driver Mismatch

**Symptom**: `TypeError: Cannot read property 'webSocketConstructor'`

**Solution**:
```typescript
// Detect driver and configure appropriately
if (process.env.DATABASE_URL.includes('neon')) {
  // Use @neondatabase/serverless configuration
  import { neonConfig } from '@neondatabase/serverless';
  neonConfig.webSocketConstructor = ws;
} else {
  // Use pg configuration
  // No special setup needed
}
```

---

## 📊 Performance Considerations

### Connection Pool Sizing

| Environment | Recommended Pool Size | Reason |
|---|---|---|
| **Production** | 20 | High concurrency, serverless scaling |
| **Staging** | 15 | Medium concurrency, staging scale |
| **Development** | 5 | Single developer, local machine |
| **Testing** | 3 | Minimal connections for tests |

### Idle Timeout

| Environment | Recommended | Reason |
|---|---|---|
| **Production** | 30000ms (30s) | Reuse connections, save resources |
| **Development** | 30000ms (30s) | Standard timeout |
| **Testing** | 5000ms (5s) | Aggressive cleanup |

---

## ✅ Checklist: Setting Up New Environment

- [ ] Install required driver (`@neondatabase/serverless` or `pg`)
- [ ] Set `DATABASE_URL` environment variable
- [ ] Configure pool settings in `pool-config.ts`
- [ ] Test connection: `npm run db:health`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Validate setup: `npm run db:verify-all`
- [ ] Test operations: `npm run db:query` (if available)
- [ ] Monitor health: `npm run db:health:watch`

---

## 📚 Related Documentation

- [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) - How to use database scripts
- [DATABASE_CONSOLIDATION_MIGRATION.md](../DATABASE_CONSOLIDATION_MIGRATION.md) - Consolidation details
- [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md) - Deprecated scripts

---

## 🔗 External References

- [Neon Documentation](https://neon.tech/docs)
- [node-postgres Documentation](https://node-postgres.com)
- [pg Pool Configuration](https://node-postgres.com/api/pool)
- [@neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless)

---

**Status**: ✅ Current  
**Last Updated**: January 8, 2026  
**Maintained By**: Database Architecture Team
