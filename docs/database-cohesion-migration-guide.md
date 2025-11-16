# Database Cohesion Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the current scattered database infrastructure to the new unified, cohesive system. The migration is designed to be incremental and non-breaking, allowing you to adopt the new infrastructure gradually.

## Migration Strategy

### Phase 1: Foundation Setup ✅ READY
**Duration**: 1-2 days  
**Risk**: Low  
**Dependencies**: None

#### What's Been Created:
- ✅ `shared/database/core/unified-config.ts` - Centralized configuration management
- ✅ `shared/database/core/database-orchestrator.ts` - Central coordination layer
- ✅ `shared/database/utils/base-script.ts` - Unified script infrastructure
- ✅ `shared/database/index.ts` - Single entry point for all database operations
- ✅ `scripts/database/enhanced-health-check.ts` - Example of new unified approach

#### What You Get:
- Centralized configuration management across all environments
- Unified error handling and logging patterns
- Consistent database operation interfaces
- Better separation of concerns

### Phase 2: Script Migration (NEXT STEP)
**Duration**: 2-3 days  
**Risk**: Low  
**Dependencies**: Phase 1

#### Migration Steps:

##### 2.1 Update Package.json Scripts
Add new unified script commands alongside existing ones:

```json
{
  "scripts": {
    "db:health:enhanced": "tsx scripts/database/enhanced-health-check.ts",
    "db:setup:unified": "tsx scripts/database/unified-setup.ts",
    "db:migrate:unified": "tsx scripts/database/unified-migrate.ts",
    "db:reset:unified": "tsx scripts/database/unified-reset.ts"
  }
}
```

##### 2.2 Create Unified Setup Script
```typescript
// scripts/database/unified-setup.ts
import { BaseDatabaseScript, ScriptContext, ScriptResult } from '../../shared/database/utils/base-script';

class UnifiedSetupScript extends BaseDatabaseScript {
  constructor() {
    super('unified-setup', 'Database setup using unified infrastructure');
  }

  async execute(context: ScriptContext): Promise<ScriptResult> {
    const { orchestrator, logger, options } = context;
    
    // Your existing setup logic here, but using the orchestrator
    // instead of direct database connections
    
    return {
      success: true,
      message: 'Database setup completed',
      duration: Date.now() - context.startTime.getTime(),
    };
  }
}
```

##### 2.3 Migrate Existing Scripts One by One
For each existing script in `scripts/database/`:

1. **Create a new unified version** using `BaseDatabaseScript`
2. **Test the new version** alongside the old one
3. **Update documentation** to reference the new script
4. **Deprecate the old script** (but keep it for backward compatibility)

### Phase 3: Server Integration (RECOMMENDED)
**Duration**: 3-4 days  
**Risk**: Medium  
**Dependencies**: Phase 2

#### Migration Steps:

##### 3.1 Update Server Initialization
Replace direct database initialization with orchestrator:

```typescript
// server/index.ts (or your main server file)
import { initializeDatabase, shutdownDatabase } from '../shared/database';

async function startServer() {
  try {
    // Initialize unified database infrastructure
    const orchestrator = await initializeDatabase({
      environment: process.env.NODE_ENV,
      enableHealthMonitoring: true,
      enableMigrations: true,
    });
    
    // Your existing server startup code
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await shutdownDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

##### 3.2 Update Repository Classes
Modify your repository classes to use the orchestrator:

```typescript
// server/infrastructure/database/repositories/base-repository.ts
import { getDatabaseOrchestrator } from '../../../../shared/database';

export abstract class BaseRepository {
  protected getConnectionManager() {
    return getDatabaseOrchestrator().getConnectionManager();
  }

  protected async withTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    const connectionManager = this.getConnectionManager();
    return connectionManager.withTransaction(callback);
  }
}
```

##### 3.3 Update Service Classes
Modify your service classes to use unified infrastructure:

```typescript
// server/infrastructure/database/services/bills-service.ts
import { executeWithDatabase } from '../../../../shared/database';

export class BillsService {
  async getBills(): Promise<Bill[]> {
    return executeWithDatabase(async (connectionManager) => {
      const db = connectionManager.getDatabase();
      return db.select().from(bills);
    });
  }
}
```

### Phase 4: Advanced Features (OPTIONAL)
**Duration**: 2-3 days  
**Risk**: Low  
**Dependencies**: Phase 3

#### 4.1 Enable Advanced Monitoring
```typescript
// Enable comprehensive health monitoring
const orchestrator = await initializeDatabase({
  enableHealthMonitoring: true,
  configOverrides: {
    operations: {
      monitoring: {
        enabled: true,
        checkInterval: 30000,
        enableAlerting: true,
      },
    },
  },
});
```

#### 4.2 Add Custom Health Checks
```typescript
// Add application-specific health checks
const healthMonitor = orchestrator.getHealthMonitor();
healthMonitor?.addAlertRule({
  name: 'high-bill-processing-time',
  condition: (metrics, result) => result.latencyMs > 2000,
  severity: 'high',
  message: 'Bill processing is taking too long',
  cooldownMs: 300000, // 5 minutes
});
```

## Backward Compatibility Strategy

### Maintaining Existing Scripts
The migration maintains full backward compatibility:

1. **Existing scripts continue to work** unchanged
2. **New unified scripts** are added alongside existing ones
3. **Gradual migration** allows testing and validation
4. **Legacy support** is maintained until full migration

### Configuration Compatibility
The unified configuration system supports existing patterns:

```typescript
// Existing environment variable patterns still work
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chanuka_dev

// New unified configuration is additive, not replacing
```

### API Compatibility
Existing database access patterns continue to work:

```typescript
// Old pattern (still works)
import { getConnectionManager } from '../shared/database/core/connection-manager';

// New pattern (recommended)
import { getDatabaseOrchestrator } from '../shared/database';
const connectionManager = getDatabaseOrchestrator().getConnectionManager();
```

## Testing Strategy

### 1. Unit Testing
Test each component in isolation:

```typescript
// Test unified configuration
import { createTestDatabaseConfig } from '../shared/database';

describe('Database Configuration', () => {
  it('should create valid test configuration', () => {
    const config = createTestDatabaseConfig();
    expect(config.environments.test).toBeDefined();
  });
});
```

### 2. Integration Testing
Test the orchestrator with real database connections:

```typescript
// Test orchestrator initialization
import { createDatabaseOrchestrator } from '../shared/database';

describe('Database Orchestrator', () => {
  it('should initialize successfully', async () => {
    const orchestrator = await createDatabaseOrchestrator({
      autoInitialize: true,
    });
    
    expect(orchestrator.isInitialized()).toBe(true);
    await orchestrator.shutdown();
  });
});
```

### 3. Script Testing
Test unified scripts in isolation:

```typescript
// Test enhanced health check script
import { EnhancedHealthCheckScript } from '../scripts/database/enhanced-health-check';

describe('Enhanced Health Check', () => {
  it('should run health check successfully', async () => {
    const script = new EnhancedHealthCheckScript();
    const result = await script.run(['--dry-run']);
    
    expect(result.success).toBe(true);
  });
});
```

## Rollback Strategy

### If Issues Arise
The migration is designed to be easily reversible:

1. **Disable new scripts** by commenting out package.json entries
2. **Revert server changes** to use direct database connections
3. **Continue using existing infrastructure** until issues are resolved
4. **No data loss** - the migration doesn't change database schema or data

### Rollback Commands
```bash
# Revert to old health check
npm run db:health  # instead of db:health:enhanced

# Use existing setup script
npm run db:setup   # instead of db:setup:unified

# Continue with current patterns
# No code changes needed - just don't use the new imports
```

## Performance Considerations

### Expected Improvements
- **Reduced Connection Overhead**: Unified connection pooling
- **Better Resource Management**: Centralized monitoring and cleanup
- **Improved Error Recovery**: Consistent retry and fallback patterns
- **Enhanced Monitoring**: Real-time health and performance tracking

### Potential Concerns
- **Initialization Time**: Slightly longer startup due to comprehensive setup
- **Memory Usage**: Additional monitoring and orchestration overhead
- **Complexity**: More sophisticated infrastructure requires understanding

### Mitigation Strategies
- **Lazy Loading**: Services initialize only when needed
- **Configuration Tuning**: Disable features not needed in development
- **Monitoring**: Built-in performance tracking to identify bottlenecks

## Success Metrics

### Technical Metrics
- [ ] **Zero Downtime**: Migration completes without service interruption
- [ ] **Performance Maintained**: No degradation in database operation speed
- [ ] **Error Rate**: No increase in database-related errors
- [ ] **Test Coverage**: All new components have >80% test coverage

### Operational Metrics
- [ ] **Script Reliability**: 99%+ success rate for database operations
- [ ] **Monitoring Coverage**: 100% of database operations monitored
- [ ] **Recovery Time**: Faster incident response through unified tooling
- [ ] **Developer Experience**: Reduced time to implement database features

### Code Quality Metrics
- [ ] **Duplication Reduction**: 60%+ reduction in database-related code duplication
- [ ] **Consistency**: 100% of database operations use unified patterns
- [ ] **Documentation**: Complete documentation for all new components
- [ ] **Team Adoption**: All team members trained on new infrastructure

## Timeline and Milestones

### Week 1: Foundation and Testing
- [ ] Day 1-2: Set up unified infrastructure (✅ COMPLETE)
- [ ] Day 3-4: Create and test enhanced health check script
- [ ] Day 5: Team review and feedback

### Week 2: Script Migration
- [ ] Day 1-2: Migrate setup and migration scripts
- [ ] Day 3-4: Migrate reset and utility scripts
- [ ] Day 5: Integration testing and validation

### Week 3: Server Integration
- [ ] Day 1-2: Update server initialization
- [ ] Day 3-4: Update repository and service classes
- [ ] Day 5: End-to-end testing

### Week 4: Advanced Features and Documentation
- [ ] Day 1-2: Enable advanced monitoring and alerting
- [ ] Day 3-4: Complete documentation and training materials
- [ ] Day 5: Team training and knowledge transfer

## Getting Started

### Immediate Next Steps
1. **Review the created infrastructure** in `shared/database/`
2. **Test the enhanced health check** script:
   ```bash
   npm run db:health:enhanced -- --detailed
   ```
3. **Create your first unified script** using `BaseDatabaseScript`
4. **Update one repository class** to use the orchestrator
5. **Provide feedback** on the approach and implementation

### Questions to Consider
- Which scripts should be migrated first?
- Are there specific database operations that need special attention?
- What monitoring and alerting requirements do you have?
- How should the migration be coordinated with the team?

This migration guide provides a clear path to achieving database infrastructure cohesion while maintaining stability and backward compatibility. The unified approach will significantly improve maintainability, reliability, and developer experience across the Chanuka platform.