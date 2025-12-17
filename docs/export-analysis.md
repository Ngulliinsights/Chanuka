# 📊 Export Validation Report

**Generated:** 12/17/2025, 8:42:50 AM
**Validator Version:** v11.0
**Analysis Duration:** 1.41s

![Status](https://img.shields.io/badge/status-failing-red)

## 📈 Summary

| Metric | Value | Status |
|:-------|------:|:------:|
| Files Scanned | 1903 | ℹ️ |
| Successfully Parsed | 1903 | ✅ |
| Parse Errors | 0 | ✅ |
| Imports Validated | 5907 | ℹ️ |
| Import Mismatches | 1653 | ❌ |
| Type Warnings | 204 | ⚠️ |


## ❌ Import/Export Mismatches (1653)

| File | Import Path | Missing Export | Recommendation |
|:-----|:------------|:---------------|:---------------|
| `client\.storybook\main.ts` | `@storybook/react-vite` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\playwright.visual.config.ts` | `@playwright/test` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\migration-helper.js` | `../store/slices/discussionSlice` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\migration-helper.js` | `../store/slices/userDashboardSlice` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\playwright.config.ts` | `@playwright/test` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\.storybook\preview.ts` | `@storybook/react` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\.storybook\preview.ts` | `../src/shared/design-system/theme/theme-provider` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\app\providers\AppProviders.tsx` | `@reduxjs/toolkit` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\app\providers\AppProviders.tsx` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\components\hooks\useDatabaseStatus.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\components\AppProviders.tsx` | `@reduxjs/toolkit` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\components\AppProviders.tsx` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\config\mobile.ts` | `@/core/mobile` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\api\bills.ts` | `../../types` | `Bill` | Did you mean 'isBill'? |
| `client\src\core\api\bills.ts` | `../../types` | `Sponsor` | Export 'Sponsor' from target module |
| `client\src\core\api\community.ts` | `../../types/community` | `Comment` | Did you mean 'CommunityComment'? |
| `client\src\core\api\hooks\use-safe-mutation.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\api\hooks\use-safe-query.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\api\privacy.ts` | `@/utils/logger` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\api\types.ts` | `../../types` | `Bill` | Did you mean 'isBill'? |
| `client\src\core\api\types.ts` | `../../types` | `Comment` | Did you mean 'isComment'? |
| `client\src\core\api\types.ts` | `../../types` | `User` | Did you mean 'isUser'? |
| `client\src\core\auth\config\auth-config.ts` | `../store/auth-middleware` | `AuthMiddlewareConfig` | Did you mean 'authMiddleware'? |
| `client\src\core\auth\config\auth-init.ts` | `./auth-config` | `type AuthSettings` | Did you mean 'AuthSettings'? |
| `client\src\core\auth\scripts\init-auth-system.ts` | `../config/auth-init` | `type AuthInitOptions` | Did you mean 'AuthInitOptions'? |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/core/auth/scripts/init-auth-system` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/core/api` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/core/auth/scripts/init-auth-system` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\init-auth-system.ts` | `@/test-utils` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/store/slices/authSlice` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/store/slices/authSlice` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/store/middleware/authMiddleware` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/services/auth-service-init` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/api/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/utils/storage` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/utils/storage` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@client/shared/ui/auth/utils/auth-validation` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\scripts\migration-helper.ts` | `@/core/auth` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\service.ts` | `@client/store/slices/sessionSlice` | `setCurrentSession` | Export 'setCurrentSession' from target module |
| `client\src\core\auth\service.ts` | `@client/core/auth` | `AuthTokens` | Export 'AuthTokens' from target module |
| `client\src\core\auth\store\auth-middleware.ts` | `@reduxjs/toolkit` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\auth\store\auth-middleware.ts` | `./auth-slice` | `clearError` | Export 'clearError' from target module |
| `client\src\core\auth\store\auth-slice.ts` | `@reduxjs/toolkit` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\community\hooks\useUnifiedCommunity.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\community\hooks\useUnifiedDiscussion.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\community\services\state-sync.service.ts` | `@tanstack/react-query` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\dashboard\context.tsx` | `@client/types` | `DashboardState` | Export 'DashboardState' from target module |
| `client\src\core\dashboard\context.tsx` | `@client/types` | `WidgetConfig` | Export 'WidgetConfig' from target module |
| `client\src\core\dashboard\context.tsx` | `@client/types` | `DashboardLayout` | Export 'DashboardLayout' from target module |
| `client\src\core\dashboard\context.tsx` | `@client/types` | `DashboardSettings` | Export 'DashboardSettings' from target module |
| `client\src\core\dashboard\hooks.ts` | `@client/types` | `WidgetConfig` | Export 'WidgetConfig' from target module |
| `client\src\core\dashboard\utils.ts` | `@client/types` | `WidgetConfig` | Export 'WidgetConfig' from target module |
| `client\src\core\dashboard\utils.ts` | `@client/types` | `DashboardLayout` | Export 'DashboardLayout' from target module |
| `client\src\core\dashboard\utils.ts` | `@client/types` | `WidgetSize` | Export 'WidgetSize' from target module |
| `client\src\core\dashboard\utils.ts` | `@client/types` | `ChartData` | Export 'ChartData' from target module |
| `client\src\core\dashboard\widgets.ts` | `@client/types` | `WidgetConfig` | Export 'WidgetConfig' from target module |
| `client\src\core\dashboard\widgets.ts` | `@client/types` | `WidgetType` | Export 'WidgetType' from target module |
| `client\src\core\dashboard\widgets.ts` | `@client/types` | `AnalyticsMetrics` | Export 'AnalyticsMetrics' from target module |
| `client\src\core\dashboard\widgets.ts` | `@client/types` | `PerformanceMetrics` | Export 'PerformanceMetrics' from target module |
| `client\src\core\dashboard\widgets.ts` | `@client/types` | `EngagementMetrics` | Export 'EngagementMetrics' from target module |
| `client\src\core\dashboard\reducer.ts` | `@client/types` | `DashboardState` | Export 'DashboardState' from target module |
| `client\src\core\dashboard\reducer.ts` | `@client/types` | `DashboardAction` | Export 'DashboardAction' from target module |
| `client\src\core\error\components\ErrorBoundary.tsx` | `@/core/browser` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\components\ErrorBoundary.tsx` | `@/core/error` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\components\ErrorBoundary.tsx` | `@/core/performance` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\components\ErrorBoundary.tsx` | `@/utils/logger` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\components\ErrorBoundary.tsx` | `@/utils/tracing` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\components\example.tsx` | `./index` | `withErrorBoundary` | Did you mean 'ErrorBoundary'? |
| `client\src\core\error\components\example.tsx` | `./index` | `useErrorBoundary` | Did you mean 'ErrorBoundary'? |
| `client\src\core\error\components\utils\contextual-messages.ts` | `@client/core/error` | `AppError` | Export 'AppError' from target module |
| `client\src\core\error\monitoring.tsx` | `@sentry/browser` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\monitoring.tsx` | `@sentry/replay` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\error\monitoring.tsx` | `@sentry/tracing` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\loading\components\LoadingProgress.tsx` | `@client/types` | `LoadingComponentProps` | Export 'LoadingComponentProps' from target module |
| `client\src\core\loading\components\LoadingSkeleton.tsx` | `@client/types` | `LoadingComponentProps` | Export 'LoadingComponentProps' from target module |
| `client\src\core\loading\components\LoadingSpinner.tsx` | `@client/types` | `LoadingComponentProps` | Export 'LoadingComponentProps' from target module |
| `client\src\core\loading\utils\progress-utils.ts` | `@client/types` | `ProgressiveStage` | Export 'ProgressiveStage' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `LoadingStateData` | Export 'LoadingStateData' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `LoadingAction` | Export 'LoadingAction' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `LoadingOperation` | Export 'LoadingOperation' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `ConnectionInfo` | Export 'ConnectionInfo' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `AdaptiveSettings` | Export 'AdaptiveSettings' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `AssetLoadingProgress` | Export 'AssetLoadingProgress' from target module |
| `client\src\core\loading\reducer.ts` | `@client/types` | `LoadingStats` | Export 'LoadingStats' from target module |
| `client\src\core\loading\utils\loading-utils.ts` | `@client/types` | `LoadingOperation` | Export 'LoadingOperation' from target module |
| `client\src\core\loading\utils\loading-utils.ts` | `@client/types` | `LoadingConfig` | Export 'LoadingConfig' from target module |
| `client\src\core\loading\utils\connection-utils.ts` | `@client/types` | `ConnectionType` | Export 'ConnectionType' from target module |
| `client\src\core\loading\utils\connection-utils.ts` | `@client/types` | `ConnectionInfo` | Export 'ConnectionInfo' from target module |
| `client\src\core\mobile\error-handler.ts` | `@/utils/logger` | `(entire module)` | Verify path exists. Check tsconfig paths or file location. |
| `client\src\core\mobile\error-handler.ts` | `./types` | `MobileErrorContext` | Export 'MobileErrorContext' from target module |

*...and 1553 more issues*

## ⚠️ Type Safety Warnings (204)

| File | Line | Issue | Severity |
|:-----|-----:|:------|:--------:|
| `client\src\core\api\client.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `client\src\core\api\config.ts` | - | High 'any' usage: 15 occurrences (threshold: 8) | High |
| `client\src\core\api\examples\circuit-breaker-usage.ts` | 26 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\examples\circuit-breaker-usage.ts` | 75 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\examples\circuit-breaker-usage.ts` | 182 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\examples\circuit-breaker-usage.ts` | 218 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\interceptors.ts` | 695 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\interceptors.ts` | 726 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\retry-handler.ts` | 352 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\retry.ts` | 235 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\retry.ts` | 246 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\api\search.ts` | - | High 'any' usage: 20 occurrences (threshold: 8) | High |
| `client\src\core\api\websocket.ts` | - | High 'any' usage: 25 occurrences (threshold: 8) | High |
| `client\src\core\auth\scripts\init-auth-system.ts` | 70 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\loading\utils\timeout-utils.ts` | 102 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\loading\utils\timeout-utils.ts` | 133 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\loading\utils\timeout-utils.ts` | 144 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\storage\index.ts` | 79 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\storage\index.ts` | 87 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\core\storage\index.ts` | 114 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\features\analytics\services\analytics.ts` | - | High 'any' usage: 20 occurrences (threshold: 8) | High |
| `client\src\features\bills\services\cache.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `client\src\features\bills\ui\analysis\conflict-of-interest\HistoricalPatternAnalysis.tsx` | - | High 'any' usage: 9 occurrences (threshold: 8) | High |
| `client\src\features\community\services\backend.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `client\src\features\search\services\intelligent-search.ts` | - | High 'any' usage: 11 occurrences (threshold: 8) | High |
| `client\src\lib\queryClient.ts` | 12 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\monitoring\error-monitoring.ts` | - | High 'any' usage: 15 occurrences (threshold: 8) | High |
| `client\src\services\errorAnalyticsBridge.ts` | - | High 'any' usage: 37 occurrences (threshold: 8) | High |
| `client\src\shared\interfaces\unified-interfaces.ts` | - | High 'any' usage: 29 occurrences (threshold: 8) | High |
| `client\src\shared\lib\queryClient.ts` | 12 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\templates\component-templates.ts` | - | High 'any' usage: 9 occurrences (threshold: 8) | High |
| `client\src\shared\ui\dashboard\hooks\useDashboard.ts` | - | High 'any' usage: 9 occurrences (threshold: 8) | High |
| `client\src\shared\ui\dashboard\recovery.ts` | 221 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\ui\dashboard\UserDashboard.tsx` | - | High 'any' usage: 13 occurrences (threshold: 8) | High |
| `client\src\shared\ui\loading\utils\connection-utils.ts` | 301 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\ui\loading\utils\timeout-utils.ts` | 429 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\ui\loading\validation.ts` | - | High 'any' usage: 9 occurrences (threshold: 8) | High |
| `client\src\shared\ui\navigation\recovery.ts` | 114 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\ui\navigation\recovery.ts` | 172 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\shared\ui\offline\offline-manager.tsx` | - | High 'any' usage: 12 occurrences (threshold: 8) | High |
| `client\src\store\index.ts` | - | High 'any' usage: 20 occurrences (threshold: 8) | High |
| `client\src\types\form.ts` | - | High 'any' usage: 13 occurrences (threshold: 8) | High |
| `client\src\utils\request-deduplicator.ts` | 135 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\utils\service-recovery.ts` | 251 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\utils\service-recovery.ts` | 276 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `client\src\utils\tracing.ts` | 153 | Async export lacks explicit return type (Promise<T> or void) | Medium |
| `scripts\database\health-check.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `scripts\database\migrate.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `scripts\database\setup.ts` | - | High 'any' usage: 10 occurrences (threshold: 8) | High |
| `scripts\seeds\seed.ts` | 7 | Async export lacks explicit return type (Promise<T> or void) | Medium |

*...and 154 more warnings*

---
*Powered by Strategic Export Validator v11.0*
