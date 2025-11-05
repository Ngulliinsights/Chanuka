# Detailed Rollback Procedures

## Overview

This document provides comprehensive rollback procedures for the library migration, with step-by-step instructions for each migration phase. These procedures ensure safe rollback capability throughout the post-migration period.

## Emergency Rollback Script

### Automated Rollback Script
```bash
#!/bin/bash
# emergency-rollback.sh

set -e

echo "=== Emergency Rollback Script ==="
echo "This will restore the system to pre-migration state"
echo "Date: $(date)"

# Validate current state
if [ ! -d "archive/" ]; then
    echo "Error: Archive directory not found"
    exit 1
fi

# Choose rollback point
echo "Available rollback points:"
echo "1. Phase 1 complete (Utilities)"
echo "2. Phase 2 complete (Search)"
echo "3. Phase 3 complete (Error Handling)"
echo "4. Phase 4 complete (Repository)"
echo "5. Phase 5 complete (WebSocket)"
echo "6. Pre-migration state"

read -p "Select rollback point (1-6): " point

case $point in
    1) tag="v1.0.0-legacy-phase1-complete" ;;
    2) tag="v1.0.0-legacy-phase2-complete" ;;
    3) tag="v1.0.0-legacy-phase3-complete" ;;
    4) tag="v1.0.0-legacy-phase4-complete" ;;
    5) tag="v1.0.0-legacy-phase5-complete" ;;
    6) tag="v1.0.0-legacy-pre-migration" ;;
    *) echo "Invalid selection"; exit 1 ;;
esac

echo "Rolling back to $tag..."

# Create backup of current state
backup_dir="rollback-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
cp -r . "$backup_dir/" 2>/dev/null || true

# Perform rollback
git checkout "$tag"

# Restore dependencies
npm install

# Run database migrations if needed
npm run db:migrate

# Restart services
npm run restart

echo "Rollback complete. Backup saved in: $backup_dir"
echo "Please verify system functionality and run tests"
```

## Phase-Specific Rollback Procedures

### Phase 1: Utilities Migration Rollback

**Scope**: Custom race condition prevention, query builder, ML service
**Estimated Time**: 30 minutes
**Risk Level**: Medium

#### Step-by-Step Instructions

1. **Stop Application Services**
   ```bash
   # Stop all services
   docker-compose down

   # Verify services are stopped
   docker ps | grep -E "(app|api|worker)"
   ```

2. **Restore Custom Implementations**
   ```bash
   # Restore race condition prevention utilities
   git checkout v1.0.0-legacy-phase1-complete -- shared/core/src/utils/race-condition-prevention.ts

   # Restore custom query builder
   git checkout v1.0.0-legacy-phase1-complete -- shared/core/src/database/query-builder.ts

   # Restore mock ML service
   git checkout v1.0.0-legacy-phase1-complete -- server/features/ml/ml-service.ts
   ```

3. **Remove Library Dependencies**
   ```bash
   # Remove async-mutex and p-limit
   npm uninstall async-mutex p-limit

   # Remove TensorFlow.js
   npm uninstall @tensorflow/tfjs-node
   ```

4. **Update Import Statements**
   ```bash
   # Update race condition imports
   find . -name "*.ts" -exec sed -i 's/async-mutex/custom-mutex/g' {} \;
   find . -name "*.ts" -exec sed -i 's/p-limit/custom-queue/g' {} \;

   # Update query builder imports
   find . -name "*.ts" -exec sed -i 's/drizzle\/db/query-builder/custom-query-builder/g' {} \;

   # Update ML service imports
   find . -name "*.ts" -exec sed -i 's/@tensorflow\/tfjs-node/mock-ml-service/g' {} \;
   ```

5. **Restore Configuration Files**
   ```bash
   # Restore any configuration changes
   git checkout v1.0.0-legacy-phase1-complete -- config/
   ```

6. **Reinstall Dependencies**
   ```bash
   npm install
   ```

7. **Run Tests**
   ```bash
   npm test -- --testPathPattern="utils|ml"
   ```

8. **Restart Services**
   ```bash
   docker-compose up -d
   ```

9. **Verify Functionality**
   ```bash
   # Test race condition prevention
   npm run test:race-conditions

   # Test query building
   npm run test:queries

   # Test ML functionality
   npm run test:ml
   ```

### Phase 2: Search Migration Rollback

**Scope**: Fuse.js search implementation
**Estimated Time**: 45 minutes
**Risk Level**: High (affects user experience)

#### Step-by-Step Instructions

1. **Stop Application Services**
   ```bash
   docker-compose down
   ```

2. **Restore Custom Search Implementation**
   ```bash
   # Restore PostgreSQL trigram search
   git checkout v1.0.0-legacy-phase2-complete -- server/features/search/engines/fuzzy-search.ts
   git checkout v1.0.0-legacy-phase2-complete -- server/features/search/engines/search-index.ts
   git checkout v1.0.0-legacy-phase2-complete -- server/features/search/engines/relevance-scoring.ts
   ```

3. **Remove Fuse.js Dependency**
   ```bash
   npm uninstall fuse.js
   ```

4. **Update Search Service Configuration**
   ```bash
   # Update search service to use custom implementation
   sed -i 's/FuseSearchEngine/CustomFuzzySearch/g' server/features/search/search-service.ts
   ```

5. **Restore Database Indexes**
   ```sql
   -- Recreate trigram indexes
   CREATE EXTENSION IF NOT EXISTS pg_trgm;

   CREATE INDEX CONCURRENTLY idx_bills_content_trgm ON bills USING gin(content gin_trgm_ops);
   CREATE INDEX CONCURRENTLY idx_bills_title_trgm ON bills USING gin(title gin_trgm_ops);
   CREATE INDEX CONCURRENTLY idx_users_name_trgm ON users USING gin(name gin_trgm_ops);
   ```

6. **Update Search API Endpoints**
   ```bash
   # Restore custom search endpoints
   git checkout v1.0.0-legacy-phase2-complete -- server/features/search/routes/
   ```

7. **Reinstall Dependencies**
   ```bash
   npm install
   ```

8. **Run Search Tests**
   ```bash
   npm test -- --testPathPattern="search"
   ```

9. **Gradual Rollout**
   ```bash
   # Use feature flags for gradual rollback
   export SEARCH_ENGINE=custom

   # Restart with feature flag
   docker-compose up -d
   ```

10. **Monitor Search Performance**
    ```bash
    # Monitor search queries
    watch -n 10 "curl -s http://localhost:3000/api/search?q=test | jq '.results | length'"

    # Check error rates
    tail -f logs/search.log | grep -i error
    ```

### Phase 3: Error Handling Migration Rollback

**Scope**: Boom and Neverthrow error handling
**Estimated Time**: 25 minutes
**Risk Level**: Medium

#### Step-by-Step Instructions

1. **Stop Application Services**
   ```bash
   docker-compose down
   ```

2. **Restore Custom Error Classes**
   ```bash
   # Restore custom error handling
   git checkout v1.0.0-legacy-phase3-complete -- shared/core/src/error-handling/
   ```

3. **Remove Library Dependencies**
   ```bash
   npm uninstall @hapi/boom neverthrow
   ```

4. **Update Error Handling Imports**
   ```bash
   # Update all error imports
   find . -name "*.ts" -exec sed -i 's/@hapi\/boom/custom-errors/g' {} \;
   find . -name "*.ts" -exec sed -i 's/neverthrow/custom-result/g' {} \;
   ```

5. **Update Middleware**
   ```bash
   # Restore custom error middleware
   git checkout v1.0.0-legacy-phase3-complete -- server/middleware/error-middleware.ts
   ```

6. **Update API Response Formatting**
   ```bash
   # Update response helpers
   find . -name "*.ts" -exec sed -i 's/boomResponse/customResponse/g' {} \;
   ```

7. **Reinstall Dependencies**
   ```bash
   npm install
   ```

8. **Test Error Handling**
   ```bash
   npm test -- --testPathPattern="error"
   ```

9. **Restart Services**
   ```bash
   docker-compose up -d
   ```

### Phase 4: Repository Migration Rollback

**Scope**: Direct Drizzle ORM usage
**Estimated Time**: 60 minutes
**Risk Level**: High (affects data operations)

#### Step-by-Step Instructions

1. **Stop Application Services**
   ```bash
   docker-compose down
   ```

2. **Restore Repository Pattern**
   ```bash
   # Restore repository classes
   git checkout v1.0.0-legacy-phase4-complete -- server/infrastructure/repositories/
   ```

3. **Update Service Layer**
   ```bash
   # Update all service classes to use repositories
   find server/features -name "*.ts" -exec sed -i 's/db\./repository\./g' {} \;
   ```

4. **Restore Repository Interfaces**
   ```bash
   git checkout v1.0.0-legacy-phase4-complete -- shared/core/src/repositories/
   ```

5. **Update Dependency Injection**
   ```bash
   # Update DI container configuration
   git checkout v1.0.0-legacy-phase4-complete -- server/container.ts
   ```

6. **Run Database Tests**
   ```bash
   npm test -- --testPathPattern="repository|database"
   ```

7. **Gradual Rollout with Feature Flags**
   ```bash
   export DATA_ACCESS_PATTERN=repository
   docker-compose up -d
   ```

8. **Monitor Database Performance**
   ```bash
   # Monitor query performance
   watch -n 5 "psql -c 'SELECT * FROM pg_stat_activity WHERE state = \'active\';'"
   ```

### Phase 5: WebSocket Migration Rollback

**Scope**: Socket.IO with Redis adapter
**Estimated Time**: 40 minutes
**Risk Level**: High (affects real-time features)

#### Step-by-Step Instructions

1. **Stop Application Services**
   ```bash
   docker-compose down
   ```

2. **Restore Custom WebSocket Implementation**
   ```bash
   # Restore custom WebSocket server
   git checkout v1.0.0-legacy-phase5-complete -- server/infrastructure/websocket.ts
   ```

3. **Remove Socket.IO Dependencies**
   ```bash
   npm uninstall socket.io @socket.io/redis-adapter redis
   ```

4. **Update WebSocket Configuration**
   ```bash
   # Restore WebSocket configuration
   git checkout v1.0.0-legacy-phase5-complete -- config/websocket.json
   ```

5. **Update Client Connections**
   ```bash
   # Update client-side WebSocket connections
   find client -name "*.ts" -exec sed -i 's/socket\.io/custom-websocket/g' {} \;
   ```

6. **Restore Pub/Sub Implementation**
   ```bash
   git checkout v1.0.0-legacy-phase5-complete -- server/infrastructure/pubsub/
   ```

7. **Test WebSocket Functionality**
   ```bash
   npm test -- --testPathPattern="websocket"
   ```

8. **Gradual Rollout**
   ```bash
   export WEBSOCKET_ENGINE=custom
   docker-compose up -d
   ```

## Database Rollback Procedures

### Schema Rollback
```sql
-- rollback-schema.sql
-- Comprehensive database rollback script

-- Phase 5: WebSocket tables
DROP TABLE IF EXISTS websocket_connections;
DROP TABLE IF EXISTS message_history;

-- Phase 4: Repository pattern (no schema changes)

-- Phase 3: Error handling (no schema changes)

-- Phase 2: Search indexes
DROP INDEX IF EXISTS idx_bills_content_fuse;
DROP INDEX IF EXISTS idx_bills_title_fuse;
DROP INDEX IF EXISTS idx_users_name_fuse;

-- Recreate trigram indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY idx_bills_content_trgm ON bills USING gin(content gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_bills_title_trgm ON bills USING gin(title gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_users_name_trgm ON users USING gin(name gin_trgm_ops);

-- Phase 1: Utilities (no schema changes)

-- Verify rollback
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Data Migration Rollback
```sql
-- rollback-data.sql
-- Data migration rollback procedures

-- Phase 5: WebSocket data
DELETE FROM audit_log WHERE action_type = 'websocket_message';
UPDATE user_sessions SET websocket_connection = NULL;

-- Phase 4: Repository data (no changes needed)

-- Phase 3: Error logging
UPDATE error_logs SET format = 'custom' WHERE format = 'boom';

-- Phase 2: Search data
UPDATE search_queries SET engine = 'trigram' WHERE engine = 'fuse';
DELETE FROM search_cache WHERE engine = 'fuse';

-- Phase 1: Utilities data (no changes needed)
```

## Configuration Rollback

### Environment Variables
```bash
# rollback-env.sh
# Environment variable rollback script

# Phase 5: WebSocket
unset WEBSOCKET_ENGINE
unset REDIS_URL
export WEBSOCKET_ENGINE=custom

# Phase 4: Repository
unset DATA_ACCESS_PATTERN
export DATA_ACCESS_PATTERN=repository

# Phase 3: Error handling
unset ERROR_FORMAT
export ERROR_FORMAT=custom

# Phase 2: Search
unset SEARCH_ENGINE
export SEARCH_ENGINE=trigram

# Phase 1: Utilities
unset CONCURRENCY_LIBRARY
unset QUERY_BUILDER
unset ML_ENGINE
export CONCURRENCY_LIBRARY=custom
export QUERY_BUILDER=custom
export ML_ENGINE=mock
```

### Application Configuration
```json
// rollback-config.json
{
  "migration": {
    "phase": 0,
    "rollback": true,
    "timestamp": "2024-11-04T20:22:39.416Z"
  },
  "components": {
    "cache": {
      "enabled": true,
      "type": "redis"
    },
    "search": {
      "engine": "trigram",
      "indexing": "database"
    },
    "errorHandling": {
      "format": "custom",
      "middleware": "custom"
    },
    "dataAccess": {
      "pattern": "repository",
      "orm": "drizzle"
    },
    "websocket": {
      "engine": "custom",
      "pubsub": "custom"
    }
  }
}
```

## Testing and Validation

### Rollback Validation Checklist
- [ ] All services start without errors
- [ ] Database connections established
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Search functionality operational
- [ ] Error handling functions properly
- [ ] Performance meets baseline requirements
- [ ] All tests pass
- [ ] Monitoring alerts clear

### Automated Validation Script
```bash
#!/bin/bash
# validate-rollback.sh

echo "=== Rollback Validation ==="

# Test service health
echo "Testing service health..."
curl -f http://localhost:3000/health || exit 1

# Test database connectivity
echo "Testing database..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" || exit 1

# Test search functionality
echo "Testing search..."
curl -f "http://localhost:3000/api/search?q=test" | jq '.success' | grep true || exit 1

# Test WebSocket
echo "Testing WebSocket..."
timeout 10 bash -c "</dev/tcp/localhost/3001" || exit 1

# Run tests
echo "Running tests..."
npm test -- --passWithNoTests --watchAll=false || exit 1

echo "Rollback validation complete!"
```

## Monitoring During Rollback

### Rollback Monitoring Dashboard
```typescript
// rollback-monitoring.ts
export class RollbackMonitor {
  private metrics: Map<string, number> = new Map();

  startMonitoring() {
    // Monitor error rates
    setInterval(() => this.checkErrorRates(), 30000);

    // Monitor performance
    setInterval(() => this.checkPerformance(), 60000);

    // Monitor service health
    setInterval(() => this.checkServiceHealth(), 30000);
  }

  private async checkErrorRates() {
    const errorRate = await this.getCurrentErrorRate();
    if (errorRate > 5) { // 5% error rate threshold
      this.alert('High error rate during rollback', { errorRate });
    }
  }

  private async checkPerformance() {
    const responseTime = await this.getAverageResponseTime();
    if (responseTime > 2000) { // 2 second threshold
      this.alert('Performance degradation during rollback', { responseTime });
    }
  }

  private async checkServiceHealth() {
    const services = ['api', 'database', 'cache', 'search'];
    for (const service of services) {
      const health = await this.checkService(service);
      if (!health) {
        this.alert(`Service ${service} unhealthy during rollback`);
      }
    }
  }
}
```

## Post-Rollback Procedures

### Cleanup After Successful Rollback
```bash
#!/bin/bash
# post-rollback-cleanup.sh

echo "=== Post-Rollback Cleanup ==="

# Remove migration artifacts
rm -rf migration-artifacts/
rm -rf temp-migration-files/

# Clean up feature flags
unset MIGRATION_PHASE
unset ROLLBACK_MODE

# Archive rollback logs
mkdir -p archives/rollbacks
mv logs/rollback-* archives/rollbacks/

# Update documentation
echo "System rolled back to pre-migration state on $(date)" >> docs/ROLLBACK_HISTORY.md

# Notify team
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"System rollback completed successfully"}' \
  $SLACK_WEBHOOK_URL

echo "Post-rollback cleanup complete"
```

### Rollback Documentation Update
```markdown
# Rollback History

## Rollback Event: 2024-11-04

**Reason**: [Performance degradation / Critical bug / Business requirement]

**Rollback Point**: Phase [X] complete

**Executed By**: [Engineer name]

**Validation Results**:
- [ ] Services healthy
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] User impact minimal

**Lessons Learned**:
- [List key learnings from rollback]

**Next Steps**:
- [Plan for re-migration or alternative approach]
```

This comprehensive rollback documentation ensures that any migration phase can be safely reversed with minimal downtime and risk.