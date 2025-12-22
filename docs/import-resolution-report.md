# Import Resolution Report

**Generated:** 12/22/2025, 6:54:03 PM
**Mode:** 🔍 Dry Run (Preview)
**Duration:** 7.80s

## 📊 Summary

| Metric | Value |
|--------|------:|
| Files Scanned | 2,051 |
| Total Imports | 6,471 |
| **Broken Imports** | **189** |
| Fixes Attempted | 189 |
| ✅ Successful | 189 |
| ❌ Failed | 0 |
| **Success Rate** | **100%** |

### Confidence Distribution

- 🟢 High (80-100%): 168
- 🟡 Medium (60-79%): 21
- 🔴 Low (<60%): 0

## ✅ Proposed Fixes (189)

### `tools\codebase-health\tests\test-data\sample-with-issues.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './non-existent-file'
+ import ... from '../../src/index'
```

*Reasons: exports all symbols (NonExistentExport), similar path (80%)*

### `tests\validation\validators.ts`

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/logger'
+ import ... from '../../server/tests/utils/logger'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/logger'
+ import ... from '../../server/tests/utils/logger'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/storage'
+ import ... from '../../server/infrastructure/database/storage'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/storage'
+ import ... from '../../server/infrastructure/database/storage'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 65%**

```diff
- import ... from '../../../client/src/utils/api'
+ import ... from '../../server/types/api'
```

*Reasons: exact filename match, similar path (75%)*

🟡 **Confidence: 65%**

```diff
- import ... from '../../../client/src/utils/api'
+ import ... from '../../server/types/api'
```

*Reasons: exact filename match, similar path (75%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/storage'
+ import ... from '../../server/infrastructure/database/storage'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/core/error'
+ import ... from '../../client/src/types/error'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/core/error'
+ import ... from '../../client/src/types/error'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/assets'
+ import ... from '../../client/src/utils/assets'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/assets'
+ import ... from '../../client/src/utils/assets'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/logger'
+ import ... from '../../server/tests/utils/logger'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/utils/logger'
+ import ... from '../../server/tests/utils/logger'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 65%**

```diff
- import ... from '../../../client/src/utils/api'
+ import ... from '../../server/types/api'
```

*Reasons: exact filename match, similar path (75%)*

🟡 **Confidence: 65%**

```diff
- import ... from '../../../client/src/utils/api'
+ import ... from '../../server/types/api'
```

*Reasons: exact filename match, similar path (75%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/core/error'
+ import ... from '../../client/src/types/error'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../../../client/src/core/api/registry'
+ import ... from '../../shared/core/middleware/registry'
```

*Reasons: exact filename match, similar path (67%)*

🟡 **Confidence: 65%**

```diff
- import ... from '../../../client/src/types/api'
+ import ... from '../../server/types/api'
```

*Reasons: exact filename match, similar path (75%)*

### `tests\utilities\shared\integration-tests.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../interfaces'
+ import ... from '../../../shared/core/caching/core/interfaces'
```

*Reasons: exports all symbols (CacheService), exact filename match, similar path (60%)*

### `tests\utilities\shared\schema-agnostic-test-helper.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../primitives'
+ import ... from './index'
```

*Reasons: exports all symbols (Result, Timestamp), same directory, similar path (100%)*

### `tests\utilities\shared\test-data-factory.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../primitives'
+ import ... from './index'
```

*Reasons: exports all symbols (Result, Maybe, UserId, Timestamp), same directory, similar path (100%)*

### `tests\utilities\shared\stress-tests.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../interfaces'
+ import ... from '../../../shared/core/caching/core/interfaces'
```

*Reasons: exports all symbols (CacheService), exact filename match, similar path (60%)*

### `shared\platform\kenya\anonymity\anonymity-helper.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../core/src/utils/anonymity-interface'
+ import ... from '../../../core/utils/anonymity-interface'
```

*Reasons: exports all symbols (AnonymityService, AnonymityLevel, DisplayIdentity, DataRetentionPolicy), exact filename match, similar path (70%)*

### `shared\database\init.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../core/src/observability/logging'
+ import ... from './connection'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

### `shared\database\monitoring.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../core/src/observability/logging'
+ import ... from './connection'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

### `shared\database\utils\base-script.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../core/src/observability/logging'
+ import ... from '../connection'
```

*Reasons: exports all symbols (logger, LoggerChild), parent directory, similar path (89%)*

### `shared\database\core\database-orchestrator.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../core/src'
+ import ... from './index'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

### `shared\database\core\health-monitor.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../core/src/observability/logging'
+ import ... from './index'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

### `shared\database\core\connection-manager.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../core/src/index'
+ import ... from './index'
```

*Reasons: exports all symbols (logger), exact filename match, same directory, similar path (100%)*

### `shared\core\validation\core\base-adapter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './interfaces.js'
+ import ... from './interfaces'
```

*Reasons: exports all symbols (ValidationAdapter, ValidationAdapterConfig, ValidationSchema, ValidationOptions, ValidationResult, BatchValidationResult, ValidationError, ValidationMetrics, ValidationHealthStatus, ValidationEvent, ValidationEventType, ValidationEventEmitter, SanitizationRules, PreprocessingRules, SchemaRegistration), exact filename match, same directory, similar path (100%)*

### `shared\core\utils\anonymity-interface.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../schema/foundation'
+ import ... from '../../schema/foundation'
```

*Reasons: exports all symbols (UserProfile), exact filename match, similar path (78%)*

### `shared\core\utils\concurrency-migration-router.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './race-condition-prevention.js'
+ import ... from './race-condition-prevention'
```

*Reasons: exports all symbols (Mutex, Semaphore, globalMutex, apiMutex, cacheMutex, apiSemaphore, fileSemaphore), exact filename match, same directory, similar path (100%)*

### `shared\core\services\test-implementations\bill-test-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Bill, NewBill), exact filename match, similar path (70%)*

### `shared\core\services\interfaces\bill-service.interface.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Bill, NewBill), exact filename match, similar path (70%)*

### `shared\core\repositories\test-implementations\bill-test-repository.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Bill, NewBill), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../../test-data-factory'
+ import ... from '../../../../tests/utilities/shared/test-data-factory'
```

*Reasons: exports all symbols (ITestDataFactory), exact filename match, similar path (60%)*

### `shared\core\repositories\interfaces\bill-repository.interface.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Bill, NewBill), exact filename match, similar path (70%)*

### `shared\core\repositories\test-implementations\sponsor-test-repository.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Sponsor, NewSponsor), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../../test-data-factory'
+ import ... from '../../../../tests/utilities/shared/test-data-factory'
```

*Reasons: exports all symbols (ITestDataFactory), exact filename match, similar path (60%)*

### `shared\core\repositories\interfaces\sponsor-repository.interface.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../schema/foundation'
+ import ... from '../../../schema/foundation'
```

*Reasons: exports all symbols (Sponsor, NewSponsor), exact filename match, similar path (70%)*

### `shared\core\observability\stack.ts`

🟡 **Confidence: 68%**

```diff
- import ... from '../metrics'
+ import ... from '../rate-limiting/metrics'
```

*Reasons: exact filename match, similar path (89%)*

🟡 **Confidence: 63%**

```diff
- import ... from '../tracing'
+ import ... from '../../../client/src/utils/tracing'
```

*Reasons: exact filename match, similar path (67%)*

### `shared\core\observability\error-management\reporting\user-error-reporter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../types.js'
+ import ... from '../types'
```

*Reasons: exports all symbols (UserErrorReport, UserFeedback, RecoveryOption, ErrorContext), exact filename match, parent directory, similar path (91%)*

### `shared\core\observability\error-management\monitoring\error-monitor.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../types.js'
+ import ... from '../types'
```

*Reasons: exports all symbols (ErrorMonitor, ErrorMetrics, ErrorAggregation, ErrorContext, ErrorAnalytics), exact filename match, parent directory, similar path (91%)*

### `shared\core\caching\ai-cache.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../core/src/index'
+ import ... from './index'
```

*Reasons: exports all symbols (logger), exact filename match, same directory, similar path (100%)*

### `shared\core\caching\factory.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './adapters/redis-adapter'
+ import ... from '../../../server/infrastructure/websocket/adapters/redis-adapter'
```

*Reasons: exports all symbols (RedisAdapter), exact filename match, similar path (60%)*

### `shared\core\caching\cache-factory.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './adapters/redis-adapter'
+ import ... from '../../../server/infrastructure/websocket/adapters/redis-adapter'
```

*Reasons: exports all symbols (RedisAdapter), exact filename match, similar path (60%)*

### `shared\core\caching\core\base-adapter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './interfaces.js'
+ import ... from './interfaces'
```

*Reasons: exports all symbols (CacheAdapter, CacheAdapterConfig, CacheMetrics, CacheHealthStatus, CacheEvent, CacheEventType, CacheEventEmitter), exact filename match, same directory, similar path (100%)*

### `shared\core\caching\adapters\multi-tier-adapter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './redis-adapter'
+ import ... from '../../../../server/infrastructure/websocket/adapters/redis-adapter'
```

*Reasons: exports all symbols (RedisAdapter, RedisAdapterConfig), exact filename match, similar path (60%)*

### `server\db.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../database-fallback'
+ import ... from './infrastructure/database/database-fallback'
```

*Reasons: exports all symbols (databaseFallbackService), exact filename match, similar path (78%)*

### `server\example-server-integration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../server-startup'
+ import ... from './server-startup'
```

*Reasons: exports all symbols (initializeServer, setupGracefulShutdown), exact filename match, same directory, similar path (100%)*

### `server\utils\api-response.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './shared-core-fallback.js'
+ import ... from './shared-core-fallback'
```

*Reasons: exports all symbols (ApiResponse, ApiErrorResponse, ApiSuccessResponse), exact filename match, same directory, similar path (100%)*

### `server\utils\analytics-controller-wrapper.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../api-response-fixer'
+ import ... from './api-response'
```

*Reasons: exports all symbols (ApiValidationError, ApiError, ApiSuccess), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../missing-modules-fallback'
+ import ... from './missing-modules-fallback'
```

*Reasons: exports all symbols (AuthenticatedRequest), exact filename match, same directory, similar path (100%)*

### `server\types\api.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../common-utils'
+ import ... from './common'
```

*Reasons: exports all symbols (ApiResponse, ErrorResponse, ResponseMetadata), same directory, similar path (100%)*

### `server\tests\unit\infrastructure\websocket\connection-manager.test.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../infrastructure/websocket/core/connection-manager.js'
+ import ... from '../../../../infrastructure/websocket/core/connection-manager'
```

*Reasons: exports all symbols (ConnectionManager, ConnectionError, AuthenticationError, ConnectionLimitError, createConnectionManager), exact filename match, similar path (64%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../infrastructure/websocket/config/runtime-config.js'
+ import ... from '../../../../infrastructure/websocket/config/runtime-config'
```

*Reasons: exports all symbols (RuntimeConfig), exact filename match, similar path (64%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../infrastructure/websocket/types.js'
+ import ... from '../../../../../client/src/core/api/types'
```

*Reasons: exports all symbols (AuthenticatedWebSocket), exact filename match, similar path (55%)*

### `server\tests\integration\websocket-service.test.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../infrastructure/websocket/config/runtime-config.js'
+ import ... from '../../infrastructure/websocket/config/runtime-config'
```

*Reasons: exports all symbols (RuntimeConfig), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../infrastructure/websocket/core/websocket-service.js'
+ import ... from '../../infrastructure/websocket/core/websocket-service'
```

*Reasons: exports all symbols (WebSocketService, WebSocketServiceOptions), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../infrastructure/websocket/types.js'
+ import ... from '../../infrastructure/websocket/types'
```

*Reasons: exports all symbols (IConnectionManager, IMessageHandler, IMemoryManager, IStatisticsCollector, IHealthChecker, AuthenticatedWebSocket, WebSocketMessage, ConnectionStats, HealthStatus, MemoryPressureData, MemoryLeakData), exact filename match, similar path (78%)*

### `server\tests\integration\websocket-backward-compatibility.test.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../infrastructure/websocket/index.js'
+ import ... from '../../infrastructure/external-data/index'
```

*Reasons: exports all symbols (createWebSocketService, BackwardCompatibleWebSocketService), exact filename match, similar path (78%)*

### `server\services\managed-government-data-integration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../missing-modules-fallback'
+ import ... from '../utils/missing-modules-fallback'
```

*Reasons: exports all symbols (UnifiedExternalAPIManagementService), exact filename match, similar path (88%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../external-api-error-handler'
+ import ... from './external-api-error-handler'
```

*Reasons: exports all symbols (ExternalAPIErrorHandler), exact filename match, same directory, similar path (100%)*

### `server\scripts\deploy-repository-migration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../infrastructure/migration/deployment-orchestrator.js'
+ import ... from '../infrastructure/migration/deployment-orchestrator'
```

*Reasons: exports all symbols (createDeploymentOrchestrator, DeploymentPlan, DeploymentPhase), exact filename match, similar path (78%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../infrastructure/migration/deployment-monitoring-dashboard.js'
+ import ... from '../infrastructure/migration/deployment-monitoring-dashboard'
```

*Reasons: exports all symbols (createDeploymentMonitoringDashboard), exact filename match, similar path (78%)*

### `server\scripts\execute-websocket-migration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../deploy-websocket-migration'
+ import ... from './deploy-websocket-migration'
```

*Reasons: exports all symbols (WebSocketMigrationDeployer), exact filename match, same directory, similar path (100%)*

### `server\scripts\deploy-websocket-migration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../redis-adapter'
+ import ... from '../infrastructure/errors/result-adapter'
```

*Reasons: exports all symbols (createAdapter), similar name (71%), similar path (78%)*

### `server\scripts\run-websocket-validation.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../final-migration-validation'
+ import ... from './final-migration-validation'
```

*Reasons: exports all symbols (FinalMigrationValidator), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../legacy-websocket-cleanup'
+ import ... from './legacy-websocket-cleanup'
```

*Reasons: exports all symbols (LegacyWebSocketCleanup), exact filename match, same directory, similar path (100%)*

### `server\scripts\simple-websocket-validation.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../batching-service'
+ import ... from '../infrastructure/websocket/batching/batching-service'
```

*Reasons: exports all symbols (*), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../notification-channels'
+ import ... from '../infrastructure/notifications/notification-channels'
```

*Reasons: exports all symbols (*), exact filename match, similar path (78%)*

### `server\scripts\validate-connection-migration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../deploy-websocket-migration'
+ import ... from './deploy-websocket-migration'
```

*Reasons: exports all symbols (WebSocketMigrationDeployer, SocketIOWebSocketService), exact filename match, same directory, similar path (100%)*

### `server\middleware\server-error-integration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../boom-error-middleware'
+ import ... from './boom-error-middleware'
```

*Reasons: exports all symbols (boomErrorMiddleware, errorContextMiddleware), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\persistence\lazy-loader.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../performance-monitor'
+ import ... from '../performance/performance-monitor'
```

*Reasons: exports all symbols (performanceMonitor), exact filename match, similar path (89%)*

### `server\infrastructure\notifications\email-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../config.d'
+ import ... from './index'
```

*Reasons: exports all symbols (config), same directory, similar path (100%)*

### `server\infrastructure\external-data\conflict-resolution-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ConflictResolution, ConflictSource, DataSource, BillData, SponsorData), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\external-data\data-synchronization-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (DataSource, SyncJob, SyncError, ConflictResolution, BillData, SponsorData, ApiResponse), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\errors\error-adapter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './error-standardization.js'
+ import ... from './error-standardization'
```

*Reasons: exports all symbols (ErrorCategory, ErrorSeverity, ErrorContext, ErrorResponse, StandardizedError), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\errors\migration-example.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './error-adapter.js'
+ import ... from './error-adapter'
```

*Reasons: exports all symbols (errorAdapter, createValidationError, createAuthenticationError, createNotFoundError), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './error-standardization.js'
+ import ... from './error-standardization'
```

*Reasons: exports all symbols (errorHandler, ErrorContext), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\errors\result-adapter.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './error-standardization.js'
+ import ... from './error-standardization'
```

*Reasons: exports all symbols (StandardizedError, ErrorResponse, ErrorCategory, ErrorSeverity, errorHandler), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\database\database-integration.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './connection-pool.js'
+ import ... from './connection-pool'
```

*Reasons: exports all symbols (DatabaseConnectionPool, createConnectionPool, ConnectionPoolConfig), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './migration-manager.js'
+ import ... from './migration-manager'
```

*Reasons: exports all symbols (DatabaseMigrationManager, createMigrationManager), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './indexing-optimizer.js'
+ import ... from './indexing-optimizer'
```

*Reasons: exports all symbols (DatabaseIndexingOptimizer, createIndexOptimizer), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './backup-recovery.js'
+ import ... from './backup-recovery'
```

*Reasons: exports all symbols (DatabaseBackupRecovery, createBackupRecovery, BackupConfig), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './monitoring.js'
+ import ... from './monitoring'
```

*Reasons: exports all symbols (DatabaseMonitoring, createDatabaseMonitoring), exact filename match, same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './validation.js'
+ import ... from './validation'
```

*Reasons: exports all symbols (DatabaseValidation, createDatabaseValidation), exact filename match, same directory, similar path (100%)*

### `server\infrastructure\cache\cache.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../4-personas-implementation-guide'
+ import ... from './index'
```

*Reasons: exports all symbols (cacheService, advancedCachingService), same directory, similar path (100%)*

### `server\features\users\infrastructure\user-storage.d.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../BaseStorage.d'
+ import ... from '../index'
```

*Reasons: exports all symbols (BaseStorage), parent directory, similar path (90%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../StorageTypes.d'
+ import ... from '../index'
```

*Reasons: exports all symbols (StorageOptions), parent directory, similar path (90%)*

### `server\features\users\application\profile.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from '../index'
```

*Reasons: exports all symbols (authenticateToken, AuthenticatedRequest), parent directory, similar path (90%)*

### `server\features\search\engines\dual-engine-orchestrator.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './semantic-search-engine'
+ import ... from './semantic-search.engine'
```

*Reasons: exports all symbols (semanticSearchEngine, SearchOptions, SearchResponse), similar name (95%), same directory, similar path (100%)*

### `server\features\search\engines\semantic-search.engine.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './embedding-service'
+ import ... from './index'
```

*Reasons: exports all symbols (embeddingService), same directory, similar path (100%)*

### `server\features\search\engines\suggestion\suggestion-engine.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types/search.types'
+ import ... from './index'
```

*Reasons: exports all symbols (SearchSuggestion, AutocompleteFacets, AutocompleteResult, SearchContext, SearchAnalytics), same directory, similar path (100%)*

### `server\features\community\social-share-storage.d.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../BaseStorage.d'
+ import ... from './index'
```

*Reasons: exports all symbols (BaseStorage), same directory, similar path (100%)*

### `server\features\bills\presentation\bills-router-migrated.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (authenticateToken), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../boom-error-middleware'
+ import ... from '../../../middleware/boom-error-middleware'
```

*Reasons: exports all symbols (asyncErrorHandler), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (AuthenticatedRequest), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../security-audit-service'
+ import ... from '../../security/security-audit-service'
```

*Reasons: exports all symbols (securityAuditService), exact filename match, similar path (80%)*

### `server\features\bills\presentation\bills-router.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (authenticateToken), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (AuthenticatedRequest), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../security-audit-service'
+ import ... from '../../security/security-audit-service'
```

*Reasons: exports all symbols (securityAuditService), exact filename match, similar path (80%)*

### `server\features\bills\presentation\bill-tracking.routes.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (authenticateToken, AuthenticatedRequest), same directory, similar path (100%)*

### `server\features\bills\application\bill-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../result-adapter'
+ import ... from '../../../infrastructure/errors/result-adapter'
```

*Reasons: exports all symbols (AsyncServiceResult), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../result-adapter'
+ import ... from '../../../infrastructure/errors/result-adapter'
```

*Reasons: exports all symbols (withResultHandling), exact filename match, similar path (70%)*

### `server\features\bills\application\bills-repository-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../bill-repository.interface'
+ import ... from './index'
```

*Reasons: exports all symbols (IBillRepository), same directory, similar path (100%)*

### `server\features\bills\application\bills.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../bill-repository.interface'
+ import ... from './index'
```

*Reasons: exports all symbols (IBillRepository), same directory, similar path (100%)*

### `server\features\analytics\conflict-detection.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './conflict-detection/index.js'
+ import ... from './index'
```

*Reasons: exports all symbols (conflictDetectionOrchestratorService, ConflictAnalysis, FinancialConflict, ProfessionalConflict, VotingAnomaly, ConflictDetectionConfig, ConflictDetectionError, Stakeholder), exact filename match, same directory, similar path (100%)*

### `server\features\analytics\types\progress-storage.d.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../BaseStorage.d'
+ import ... from './index'
```

*Reasons: exports all symbols (BaseStorage), same directory, similar path (100%)*

### `server\features\analytics\services\engagement.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from './index'
```

*Reasons: exports all symbols (authenticateToken, AuthenticatedRequest), same directory, similar path (100%)*

### `server\features\analytics\middleware\analytics-context.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from '../conflict-detection'
```

*Reasons: exports all symbols (AuthenticatedRequest), parent directory, similar path (90%)*

### `server\features\analytics\middleware\performance-tracking.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from '../conflict-detection'
```

*Reasons: exports all symbols (AuthenticatedRequest), parent directory, similar path (90%)*

### `server\features\analytics\financial-disclosure\monitoring.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (FinancialDisclosure, FinancialAlert, MonitoringStatus, CompletenessScore, SponsorInfo, SystemHealthStatus, HealthCheckResult), exact filename match, same directory, similar path (100%)*

### `server\features\analytics\conflict-detection\conflict-detection-engine.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (FinancialConflict, ProfessionalConflict, VotingAnomaly, ConflictDetectionConfig, ValidatedVote, ConflictDetectionError, isValidVote), exact filename match, same directory, similar path (100%)*

### `server\features\analytics\conflict-detection\conflict-detection-orchestrator.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ConflictAnalysis, ConflictDetectionError, Stakeholder), exact filename match, same directory, similar path (100%)*

### `server\features\analytics\conflict-detection\conflict-severity-analyzer.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ConflictAnalysis, FinancialConflict, ProfessionalConflict, VotingAnomaly, ConflictDetectionConfig), exact filename match, same directory, similar path (100%)*

### `server\features\analytics\conflict-detection\conflict-resolution-recommendation.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ConflictAnalysis, FinancialConflict, ProfessionalConflict, VotingAnomaly), exact filename match, same directory, similar path (100%)*

### `server\features\analysis\presentation\analysis.routes.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../AuthAlert'
+ import ... from '../../bills/presentation/index'
```

*Reasons: exports all symbols (authenticateToken, AuthenticatedRequest), similar path (80%)*

### `server\features\analysis\application\constitutional-analysis.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../constitutional-analysis-service-complete'
+ import ... from '../../constitutional-analysis/application/constitutional-analysis-service-complete'
```

*Reasons: exports all symbols (constitutionalAnalysisServiceComplete), exact filename match, similar path (80%)*

### `server\features\admin\admin-router.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../query-executor'
+ import ... from '../../infrastructure/database/core/query-executor'
```

*Reasons: exports all symbols (*), exact filename match, similar path (70%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../query-executor'
+ import ... from '../../infrastructure/database/core/query-executor'
```

*Reasons: exports all symbols (*), exact filename match, similar path (70%)*

### `server\features\admin\content-moderation.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './moderation/index.js'
+ import ... from './index'
```

*Reasons: exports all symbols (moderationOrchestratorService, ContentModerationFilters, ModerationItem, ModerationActionRecord, ContentAnalytics, BulkModerationOperation, ContentAnalysisResult), exact filename match, same directory, similar path (100%)*

### `server\features\admin\system.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../shared/core/src/utils/response-helpers'
+ import ... from '../../../shared/core/utils/response-helpers'
```

*Reasons: exports all symbols (ResponseHelper), exact filename match, similar path (67%)*

### `server\features\admin\moderation\moderation-decision.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ModerationItem, ModerationActionRecord, BulkModerationOperation, PaginationInfo), exact filename match, same directory, similar path (100%)*

### `server\features\admin\moderation\moderation-orchestrator.service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './types.js'
+ import ... from './types'
```

*Reasons: exports all symbols (ContentModerationFilters, ModerationItem, ModerationActionRecord, ContentAnalysisResult, BulkModerationOperation, ContentAnalytics, PaginationInfo), exact filename match, same directory, similar path (100%)*

### `server\core\validation\input-validation-service.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './validation-utils.js'
+ import ... from './validation-utils'
```

*Reasons: exports all symbols (validateEmail, validatePhone, validateURL, sanitizeString, sanitizeHtml, commonZodSchemas), exact filename match, same directory, similar path (100%)*

### `server\core\auth\passwordReset.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../config.d'
+ import ... from './index'
```

*Reasons: exports all symbols (config), same directory, similar path (100%)*

### `server\config\development.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../4-personas-implementation-guide'
+ import ... from './index'
```

*Reasons: exports all symbols (AppConfig), same directory, similar path (100%)*

### `server\config\test.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../4-personas-implementation-guide'
+ import ... from './index'
```

*Reasons: exports all symbols (AppConfig), same directory, similar path (100%)*

### `server\config\production.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../4-personas-implementation-guide'
+ import ... from './index'
```

*Reasons: exports all symbols (AppConfig), same directory, similar path (100%)*

### `scripts\bundle-analyzer.js`

🟢 **Confidence: 100%**

```diff
- import ... from './analyze-bundle.js'
+ import ... from './analyze-bundle'
```

*Reasons: exact filename match, same directory, similar path (100%)*

### `scripts\deploy-production.js`

🟢 **Confidence: 100%**

```diff
- import ... from '../client/scripts/advanced-bundle-analyzer.js'
+ import ... from './bundle-analysis-plugin'
```

*Reasons: exports all symbols (default), same directory, similar path (100%)*

### `scripts\emergency-build-fix.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './foundation'
+ import ... from '../shared/schema/foundation'
```

*Reasons: exports all symbols (bills, sponsors, users), exact filename match, similar path (75%)*

### `scripts\fix-missing-exports.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './schema'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (users, user_profiles, bills, sponsors, notifications, comments, comment_votes, bill_engagement, sessions), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './schema'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (users, user_profiles, sessions, bills, sponsors, comments, comment_votes, bill_engagement, notifications), same directory, similar path (100%)*

### `scripts\fix-shared-imports.js`

🟢 **Confidence: 100%**

```diff
- import ... from '../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

### `scripts\fix-server-logger-imports.js`

🟢 **Confidence: 100%**

```diff
- import ... from '../utils/logger.js'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../utils/logger.js'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../utils/logger.js'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../utils/logger.js'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../utils/logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../shared/core/index.js'
+ import ... from '../tests/utilities/index'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (75%)*

### `scripts\fix-typescript-syntax-errors.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../infrastructure/database/database-service'
+ import ... from '../server/infrastructure/database/database-service'
```

*Reasons: exports all symbols (databaseService), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../shared/schema/foundation.js'
+ import ... from '../shared/schema/foundation'
```

*Reasons: exports all symbols (bills, sponsors, Bill), exact filename match, similar path (75%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../shared/schema/citizen_participation.js'
+ import ... from '../shared/schema/citizen_participation'
```

*Reasons: exports all symbols (bill_engagement, comments), exact filename match, similar path (75%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../shared/core'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../infrastructure/query-cache'
+ import ... from '../server/infrastructure/cache/query-cache'
```

*Reasons: exports all symbols (QueryCache, CacheHelpers), exact filename match, similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../infrastructure/cache/cache-service'
+ import ... from '../server/infrastructure/cache/cache-service'
```

*Reasons: exports all symbols (serverCache), exact filename match, similar path (67%)*

### `scripts\integrate-error-management.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './logger'
+ import ... from '../server/tests/utils/logger'
```

*Reasons: exports all symbols (logger), exact filename match, similar path (67%)*

### `scripts\migrate-logging.js`

🟢 **Confidence: 100%**

```diff
- import ... from './unified-logger'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './unified-logger'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from './unified-logger'
+ import ... from './align-schema'
```

*Reasons: exports all symbols (logger), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../types/errors'
+ import ... from './align-schema'
```

*Reasons: exports all symbols ($1), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../types/errors'
+ import ... from './align-schema'
```

*Reasons: exports all symbols ($1), same directory, similar path (100%)*

### `scripts\performance-budget-enforcer.cjs`

🟡 **Confidence: 63%**

```diff
- import ... from '../shared/core/src/performance'
+ import ... from '../client/src/types/performance'
```

*Reasons: exact filename match, similar path (67%)*

### `scripts\validate-imports.js`

🟢 **Confidence: 100%**

```diff
- import ... from '../config.d'
+ import ... from './bundle-analysis-plugin'
```

*Reasons: exports all symbols (default), same directory, similar path (100%)*

### `scripts\typescript-fixer\tests\fixtures\database-patterns.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../connection-manager-metrics'
+ import ... from './chanuka-edge-case-patterns'
```

*Reasons: exports all symbols (database, withTransaction), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../../database-service'
+ import ... from '../../../../server/infrastructure/database/database-service'
```

*Reasons: exports all symbols (databaseService), exact filename match, similar path (60%)*

### `scripts\database\consolidate-database-infrastructure.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './seed-database.js'
+ import ... from './reset-database'
```

*Reasons: exports all symbols (*), similar name (79%), same directory, similar path (100%)*

### `scripts\database\reset.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './seed-database.js'
+ import ... from './reset-database'
```

*Reasons: exports all symbols (*), similar name (79%), same directory, similar path (100%)*

### `scripts\database\setup.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './seed-database.js'
+ import ... from './reset-database'
```

*Reasons: exports all symbols (*), similar name (79%), same directory, similar path (100%)*

### `client\migration-helper.js`

🟢 **Confidence: 100%**

```diff
- import ... from '../store/slices/discussionSlice'
+ import ... from '../shared/core/config/manager'
```

*Reasons: exports all symbols (selectDiscussionState, selectThread, selectComment, selectThreadComments, loadDiscussionData, addCommentAsync, voteCommentAsync, reportCommentAsync, setLoading, setError), similar path (67%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../store/slices/userDashboardSlice'
+ import ... from './src/scripts/consolidate-websocket-migration'
```

*Reasons: exports all symbols (selectUserDashboardState, selectDashboardData, selectFilteredEngagementHistory, selectEngagementStats, setDashboardData, trackBill, untrackBill, updateBillNotifications, dismissRecommendation, acceptRecommendation, refreshRecommendations, requestDataExport, updatePreferences, updatePrivacyControls), similar path (78%)*

### `client\src\shared\ui\navigation\navigation-preferences-dialog.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../ui/dialog'
+ import ... from './index'
```

*Reasons: exports all symbols (Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger), same directory, similar path (100%)*

### `client\src\shared\ui\navigation\ProgressiveDisclosureNavigation.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../ui/dropdown-menu'
+ import ... from './index'
```

*Reasons: exports all symbols (DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger), same directory, similar path (100%)*

### `client\src\shared\templates\component-templates.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './${this.toCamelCase(componentName)}'
+ import ... from './index'
```

*Reasons: exports all symbols (${pascalName), same directory, similar path (100%)*

### `client\src\shared\design-system\COMPONENT_FLATTENING_EXECUTION_REPORT.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './components/Button'
+ import ... from './interactive/Button'
```

*Reasons: exports all symbols (Button), exact filename match, child directory, similar path (91%)*

### `client\src\shared\design-system\strategy.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../tokens'
+ import ... from './index'
```

*Reasons: exports all symbols (colorTokens, spacingTokens), same directory, similar path (100%)*

### `client\src\services\mockUserData.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './userProfileService'
+ import ... from './auth-service-init'
```

*Reasons: exports all symbols (UserProfile, SavedBill, UserEngagementHistory, UserPreferences, UserBadge, UserAchievement), same directory, similar path (100%)*

### `client\src\hooks\use-performance-monitor.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../../../performance-monitor'
+ import ... from './index'
```

*Reasons: exports all symbols (runtimePerformanceMonitor), same directory, similar path (100%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../PerformanceDashboard'
+ import ... from '../shared/ui/performance/PerformanceDashboard'
```

*Reasons: exports all symbols (*), exact filename match, similar path (73%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../PerformanceDashboard'
+ import ... from '../shared/ui/performance/PerformanceDashboard'
```

*Reasons: exports all symbols (*), exact filename match, similar path (73%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../../../PerformanceDashboard'
+ import ... from '../shared/ui/performance/PerformanceDashboard'
```

*Reasons: exports all symbols (*), exact filename match, similar path (73%)*

### `client\src\features\users\ui\verification\ExpertBadge.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../icons/SimpleIcons'
+ import ... from './index'
```

*Reasons: exports all symbols (GraduationCap), same directory, similar path (100%)*

### `client\src\features\users\ui\verification\ExpertProfileCard.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../icons/SimpleIcons'
+ import ... from './index'
```

*Reasons: exports all symbols (Globe, ExternalLink, Linkedin, GraduationCap), same directory, similar path (100%)*

### `client\src\features\security\ui\privacy\DataUsageReportDashboard.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../icons/SimpleIcons'
+ import ... from './index'
```

*Reasons: exports all symbols (Globe), same directory, similar path (100%)*

### `client\src\features\pretext-detection\hooks\usePretextAnalysis.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './use-safe-query'
+ import ... from '../../../hooks/use-safe-query'
```

*Reasons: exports all symbols (useSafeQuery), exact filename match, similar path (73%)*

### `client\src\features\bills\ui\tracking\real-time-tracker.tsx`

🟢 **Confidence: 100%**

```diff
- import ... from '../ui/select'
+ import ... from '../../../../shared/design-system/interactive/Select'
```

*Reasons: exports all symbols (Select, SelectContent, SelectItem, SelectTrigger, SelectValue), similar name (100%), similar path (67%)*

### `client\src\core\test-consolidated-realtime.ts`

🟢 **Confidence: 100%**

```diff
- import ... from './client/src/core/realtime'
+ import ... from './index'
```

*Reasons: exports all symbols (realTimeService, useBillTracking, useCommunityRealTime, useWebSocket, getRealTimeConfig, ConnectionState, BillUpdate, TypingIndicator), same directory, similar path (100%)*

### `client\src\core\realtime\manager.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../types'
+ import ... from '../error/types'
```

*Reasons: exports all symbols (WebSocketConfig, ConnectionState, Subscription, WebSocketMessage, MessageHandler, EventListener, HeartbeatMessage, SubscriptionMessage, BatchMessage), exact filename match, similar path (90%)*

🟢 **Confidence: 100%**

```diff
- import ... from '../utils/event-emitter'
+ import ... from './utils/event-emitter'
```

*Reasons: exports all symbols (EventEmitter), exact filename match, child directory, similar path (91%)*

### `client\.storybook\preview.ts`

🟢 **Confidence: 100%**

```diff
- import ... from '../src/shared/design-system/theme/theme-provider'
+ import ... from '../src/shared/design-system/themes/themeProvider'
```

*Reasons: exports all symbols (ThemeProvider), similar name (93%), similar path (64%)*

## ⚙️  Configuration

- **Min Confidence:** 60%
- **Path Aliases:** 9
- **Strategies:** exactMatch, exportAnalysis, nameMatching, pathProximity, fuzzyMatching

### Path Aliases

- `@` → `.`
- `@shared` → `shared`
- `@shared/core` → `shared/core/src`
- `@shared/database` → `shared/database`
- `@shared/schema` → `shared/schema`
- `@shared/utils` → `shared/utils`
- `@server` → `server`
- `@client` → `client/src`
- `@tests` → `tests`

## 📋 Next Steps

### Review & Apply

1. Review the proposed fixes above
2. Adjust confidence threshold if needed: `CONFIDENCE=80`
3. Apply changes:

```bash
DRY_RUN=false node import-resolver.mjs
```

---

*Generated by Import Resolver*
