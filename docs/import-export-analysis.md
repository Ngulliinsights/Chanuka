# Import/Export Analysis Report

**Generated:** 12/22/2025, 11:51:05 PM
**Duration:** 2.45s
**Mode:** Full | Normal
**Status:** ❌ Issues Found

## 📊 Summary

| Metric | Value |
|--------|------:|
| Files Analyzed | 2,065 |
| Imports Checked | 6,502 |
| Dynamic Imports | 199 |
| Re-exports | 464 |
| Path Aliases | 9 |
| **Missing Files** | **0** |
| **Missing Exports** | **24** |
| **Circular Dependencies** | **7** |
| Type Warnings | 196 |

## ⚠️  Missing Exports (24)

### `tools\codebase-health\tests\fixtures\import-issues.ts`

**`./sample-issues`**

- Missing: `missingExport`
- Available: `ForwardDeclaredType`, `validExport`, `fetchData`, `processData`, `getElement`, `mainFunction`, `default`

### `tests\utilities\shared\integration-tests.ts`

**`../../../client/src/utils/logger`**

- Missing: `UnifiedLogger`
- Available: `LogContext`, `Logger`, `RenderTrackingData`, `ComponentLifecycleData`, `PerformanceImpactData`, `RenderStats`, `ExtendedLogger`, `logger`, `coreLogger`, `ErrorSeverity`

### `tests\utilities\shared\stress-tests.ts`

**`../../../client/src/utils/logger`**

- Missing: `UnifiedLogger`
- Available: `LogContext`, `Logger`, `RenderTrackingData`, `ComponentLifecycleData`, `PerformanceImpactData`, `RenderStats`, `ExtendedLogger`, `logger`, `coreLogger`, `ErrorSeverity`

### `tests\utilities\shared\form\testing-library-form-utils.ts`

**`./base-form-testing`**

- Missing: `BaseFormTestingUtils`
- Available: `ValidationRule`, `FormValidationRule`, `FormField`, `FormFieldValidation`, `FormValidationConfig`, `FormTestConfig`, `FormTestResult`

### `shared\database\index.ts`

**`./utils/base-script`**

- Missing: `BaseDatabaseScript`
- Available: `ScriptOptions`, `ScriptResult`, `ScriptContext`, `DatabaseScriptLogger`, `runDatabaseScript`, `createScriptResult`

### `shared\core\rate-limiting\adapters\sliding-window-adapter.ts`

**`../algorithms/sliding-window`**

- Missing: `SlidingWindowStore`
- Available: `SlidingWindowConfig`, `SlidingWindow`

### `shared\core\rate-limiting\adapters\token-bucket-adapter.ts`

**`../algorithms/token-bucket`**

- Missing: `TokenBucketStore`
- Available: `TokenBucketConfig`, `TokenBucket`

### `shared\core\caching\cache-factory.ts`

**`../cache`**

- Missing: `CacheAdapter`, `CacheMetrics`, `CacheHealthStatus`
- Available: `CacheService`, `getDefaultCache`, `setDefaultCache`, `createCacheService`, `MemoryCache`

### `shared\core\caching\single-flight-cache.ts`

**`./types`**

- Missing: `CacheMetrics`, `CacheHealthStatus`
- Available: `CacheService`, `CacheEntry`, `CacheConfig`, `CacheOptions`, `CacheKeyGenerator`, `CircuitBreakerState`, `CacheAdapter`, `CacheEventType`, `CacheEvent`, `CacheFactoryOptions`

### `shared\core\caching\adapters\multi-tier-adapter.ts`

**`../types`**

- Missing: `CacheHealthStatus`, `CacheMetrics`, `CacheTierStats`
- Available: `CacheService`, `CacheEntry`, `CacheConfig`, `CacheOptions`, `CacheKeyGenerator`, `CircuitBreakerState`, `CacheAdapter`, `CacheEventType`, `CacheEvent`, `CacheFactoryOptions`

### `server\infrastructure\websocket\adapters\native-websocket-adapter.ts`

**`./websocket-adapter`**

- Missing: `WebSocketAdapter`
- Available: `WebSocketMessage`, `ServiceStats`, `HealthStatus`

### `server\infrastructure\websocket\adapters\socketio-adapter.ts`

**`./websocket-adapter`**

- Missing: `WebSocketAdapter`
- Available: `WebSocketMessage`, `ServiceStats`, `HealthStatus`

### `client\src\shared\ui\templates\component-template.tsx`

**`../utils/error-handling`**

- Missing: `useErrorHandler`
- Available: `useUIErrorHandler`, `UIErrorBoundary`

### `client\src\shared\ui\templates\hook-template.ts`

**`../utils/error-handling`**

- Missing: `useErrorHandler`
- Available: `useUIErrorHandler`, `UIErrorBoundary`

### `client\src\shared\ui\dashboard\types\components.ts`

**`./widgets`**

- Missing: `WidgetConfig`
- Available: `WidgetType`, `WidgetProps`, `AnalyticsWidgetData`, `PerformanceWidgetData`, `EngagementWidgetData`, `MetricsWidgetData`, `ChartWidgetData`, `WidgetLayoutProps`, `WidgetGridProps`, `WidgetStackProps`

### `client\src\shared\ui\dashboard\types\widgets.ts`

**`../../types`**

- Missing: `WidgetConfig`
- Available: `ComponentVariant`, `DashboardComponentVariant`, `DashboardVariant`, `PrivacyComponentVariant`, `PrivacyMode`, `AuthComponentVariant`, `BaseComponentProps`, `DashboardStats`, `ActivityRecord`, `BillRecord`

### `client\src\shared\lib\react-query-config.ts`

**`../infrastructure/store/slices/uiSlice`**

- Missing: `setOnlineStatus`
- Available: `selectTheme`, `selectSidebarCollapsed`, `selectCurrentPage`, `selectBreadcrumbs`, `selectActiveModal`, `selectModalData`, `selectGlobalLoading`, `selectLoadingMessage`, `selectToast`, `selectIsOnline`

### `client\src\shared\infrastructure\store\middleware\authMiddleware.ts`

**`../slices/sessionSlice`**

- Missing: `setCurrentSession`, `recordActivity`
- Available: `SessionInfo`, `SessionConfig`, `ActivityType`, `SessionActivity`, `WarningType`, `WarningSeverity`, `SessionWarning`, `SessionData`, `SessionState`, `fetchActiveSessions`

### `client\src\features\bills\ui\bills-dashboard.tsx`

**`../model/types`**

- Missing: `Bill`
- Available: `Sponsor`, `BillAnalysis`, `StakeholderImpact`, `ConflictOfInterest`, `EngagementMetrics`, `BillsQueryParams`, `CommentPayload`, `EngagementPayload`, `BillsResponse`, `BillCategoriesResponse`

### `client\src\features\bills\ui\virtual-bill-grid.tsx`

**`../model/types`**

- Missing: `Bill`
- Available: `Sponsor`, `BillAnalysis`, `StakeholderImpact`, `ConflictOfInterest`, `EngagementMetrics`, `BillsQueryParams`, `CommentPayload`, `EngagementPayload`, `BillsResponse`, `BillCategoriesResponse`

### `client\src\core\navigation\context.tsx`

**`../../shared/infrastructure/store/slices/navigationSlice`**

- Missing: `setCurrentPath`, `updateBreadcrumbs`, `updateRelatedPages`, `setCurrentSection`, `toggleSidebar`, `toggleMobileMenu`, `setMobile`, `setSidebarCollapsed`, `setMounted`, `setUserRole`, `updatePreferences`, `addToRecentPages`, `clearPersistedState`
- Available: `selectCurrentPath`, `selectPreviousPath`, `selectBreadcrumbs`, `selectRelatedPages`, `selectCurrentSection`, `selectSidebarOpen`, `selectMobileMenuOpen`, `selectIsMobile`, `selectSidebarCollapsed`, `selectMounted`

### `client\src\core\auth\store\auth-middleware.ts`

**`./auth-slice`**

- Missing: `clearError`
- Available: `AuthState`, `login`, `register`, `logout`, `refreshTokens`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `changePassword`, `setupTwoFactor`

### `client\src\core\auth\config\auth-config.ts`

**`../store/auth-middleware`**

- Missing: `AuthMiddlewareConfig`
- Available: `createAuthMiddleware`, `authMiddleware`, `default`

### `client\src\core\api\community.ts`

**`../../types/community`**

- Missing: `Comment`
- Available: `VoteRequest`, `ActivityItem`, `TrendingTopic`, `ExpertInsight`, `Campaign`, `Petition`, `CommunityStats`, `LocalImpactMetrics`, `CommunityComment`, `CommentReport`

## 🔄 Circular Dependencies (7)

These files form circular dependency chains:

- shared\core\observability\interfaces.ts → shared\core\observability\interfaces.ts → shared\core\observability\telemetry.ts
- shared\core\observability\interfaces.ts → shared\core\observability\telemetry.ts → shared\core\observability\telemetry.ts
- server\infrastructure\database\core\connection-manager-metrics.ts → server\infrastructure\database\core\connection-manager-metrics.ts → server\infrastructure\database\core\connection-manager.ts
- server\infrastructure\database\core\connection-manager-metrics.ts → server\infrastructure\database\core\connection-manager.ts → server\infrastructure\database\core\connection-manager.ts
- client\src\shared\infrastructure\store\index.ts → client\src\shared\infrastructure\store\slices\userDashboardSlice.ts → client\src\shared\infrastructure\store\slices\userDashboardSlice.ts
- client\src\shared\infrastructure\store\slices\userDashboardSlice.ts → client\src\shared\infrastructure\store\slices\userDashboardSlice.ts
- client\src\shared\infrastructure\store\index.ts → client\src\shared\infrastructure\store\index.ts → client\src\shared\infrastructure\store\slices\userDashboardSlice.ts

**Impact:** Circular dependencies can cause:
- Initialization order issues
- Harder code maintenance
- Potential runtime errors

## 🛡️  Type Safety Warnings (196)

### `shared\database\connection.ts`

- [Medium] Line 214: Async export lacks explicit return type
- [Medium] Line 412: Async export lacks explicit return type
- [Medium] Line 434: Async export lacks explicit return type

### `shared\database\index.ts`

- [Medium] Line 83: Async export lacks explicit return type
- [Medium] Line 244: Async export lacks explicit return type

### `shared\database\core\database-orchestrator.ts`

- [Medium] Line 441: Async export lacks explicit return type
- [Medium] Line 459: Async export lacks explicit return type

### `shared\database\pool.ts`

- [Medium] Line 621: Async export lacks explicit return type
- [Medium] Line 708: Async export lacks explicit return type

### `shared\database\utils\base-script.ts`

- [Medium] Line 414: Async export lacks explicit return type

### `shared\database\core\connection-manager.ts`

- [Medium] Line 925: Async export lacks explicit return type
- [Medium] Line 935: Async export lacks explicit return type

### `shared\core\utils\async-utils.ts`

- [Medium] Line 126: Async export lacks explicit return type
- [Medium] Line 341: Async export lacks explicit return type

### `shared\core\utils\browser-logger.ts`

- [High] High 'any' usage: 14 occurrences (threshold: 8)

### `shared\core\utils\data-utils.ts`

- [High] High 'any' usage: 12 occurrences (threshold: 8)

### `shared\core\utils\performance-utils.ts`

- [Medium] Line 303: Async export lacks explicit return type
- [Medium] Line 457: Async export lacks explicit return type

### `shared\core\utils\race-condition-prevention.ts`

- [Medium] Line 111: Async export lacks explicit return type

### `shared\core\utils\type-guards.ts`

- [High] High 'any' usage: 30 occurrences (threshold: 8)

### `shared\core\utils\examples\concurrency-migration-example.ts`

- [Medium] Line 14: Async export lacks explicit return type
- [Medium] Line 55: Async export lacks explicit return type
- [Medium] Line 86: Async export lacks explicit return type
- [Medium] Line 130: Async export lacks explicit return type
- [Medium] Line 179: Async export lacks explicit return type
- [Medium] Line 226: Async export lacks explicit return type

### `shared\core\utils\api\client.ts`

- [High] High 'any' usage: 10 occurrences (threshold: 8)

### `shared\core\observability\correlation.ts`

- [Medium] Line 366: Async export lacks explicit return type

*...and 122 more files*

## 📦 Barrel File Recommendations (159)

### `tests\validation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\schema\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\platform\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\database\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\database\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\validation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\validation\schemas\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\validation\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\utils\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\types\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\repositories\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\rate-limiting\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\rate-limiting\adapters\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\primitives\types\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\primitives\constants\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\performance\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\tracing\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\metrics\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\logging\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\health\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\observability\error-management\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\middleware\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\config\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\caching\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\caching\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `shared\core\caching\adapters\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\utils\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\monitoring\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\migration\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\memory\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\config\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\batching\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\websocket\adapters\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\persistence\drizzle\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\notifications\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\monitoring\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\migration\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\logging\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\external-data\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\database\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\cache\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\infrastructure\adapters\mappings\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\users\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\users\application\use-cases\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\sponsors\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\security\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\search\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\search\engines\suggestion\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\search\engines\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\recommendation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\notifications\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\constitutional-analysis\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\community\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\bills\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\bills\presentation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\bills\infrastructure\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\bills\application\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\argument-intelligence\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\analytics\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\analytics\storage\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\analytics\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\analytics\conflict-detection\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\advocacy\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\admin\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\features\admin\moderation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\core\validation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `server\core\errors\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `scripts\typescript-fixer\src\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\types\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\validation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\realtime\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\privacy\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\offline\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\performance\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\notifications\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\navigation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\mobile\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\mobile\layout\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\mobile\interaction\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\mobile\data-display\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\loading\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\loading\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\loading\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\layout\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\education\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\dashboard\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\dashboard\utils\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\ui\dashboard\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\testing\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\templates\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\lib\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\hooks\mobile\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\typography\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\standards\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\media\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\interactive\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\feedback\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\shared\design-system\contexts\index.tsx`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\security\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\lib\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\hooks\index.ts`

- **Issue:** Large barrel file with 32 re-exports
- **Recommendation:** Consider splitting or using direct imports
- **Severity:** Medium

### `client\src\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\hooks\mobile\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\users\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\users\ui\verification\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\users\ui\auth\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\users\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\security\ui\privacy\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\search\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\search\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\pretext-detection\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\community\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\community\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\community\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\bills\ui\analysis\conflict-of-interest\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\bills\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\bills\model\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analytics\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analytics\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analytics\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\ui\dashboard\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\model\services\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\model\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\analysis\ui\conflict-of-interest\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\features\admin\ui\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\storage\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\realtime\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\performance\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\navigation\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\navigation\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\loading\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\loading\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\loading\components\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\error\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\error\components\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\community\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\browser\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\auth\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\api\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\api\types\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\core\api\hooks\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\context\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

### `client\src\app\shell\index.ts`

- **Issue:** Mixed re-exports and direct exports
- **Recommendation:** Keep barrel files focused on re-exporting
- **Severity:** Low

## 🔧 How to Fix

### Missing Files
1. Check for typos in import paths
2. Verify files weren't deleted/moved
3. Update path aliases in tsconfig.json
4. Check file extensions match

### Missing Exports
1. Verify symbols are exported from target file
2. Check for typos in export/import names
3. Ensure correct default vs named export usage
4. Review barrel file re-exports

### Circular Dependencies
1. Extract shared code to separate module
2. Use dependency injection
3. Restructure code to break cycles
4. Consider using interfaces/types for decoupling

## ⚙️  Configuration

- **Root:** `C:\Users\Access Granted\Downloads\projects\SimpleTool`
- **Extensions:** `.ts, .tsx, .js, .jsx, .mjs, .cjs`
- **Excluded:** `node_modules, dist, build, .git, coverage`, ...
- **Path Aliases:**
  - `@` → `.`
  - `@shared` → `shared`
  - `@shared/core` → `shared/core/src`
  - `@shared/database` → `shared/database`
  - `@shared/schema` → `shared/schema`
  - `@shared/utils` → `shared/utils`
  - `@server` → `server`
  - `@client` → `client/src`
  - `@tests` → `tests`

---

*Analysis by Unified Import/Export Validator v12.0*
