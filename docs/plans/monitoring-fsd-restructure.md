# Monitoring & Performance FSD Restructure Plan

## Current Issues
1. **Hyphenated naming**: `enhanced-error-monitoring.ts`, `enhanced-performance-monitoring.ts` - the "enhanced" prefix doesn't add semantic value
2. **Scattered functionality**: Related monitoring features across multiple directories
3. **Legacy services**: Valuable functionality in `/services` needs FSD integration

## Recommended Structure

### 1. Core Layer (`client/src/infrastructure/`)
Keep foundational systems here:
```
core/
├── error/                    # ✅ Already well-structured
├── performance/              # ✅ Already well-structured  
└── monitoring/               # ✅ Keep as integration layer
    ├── index.ts             # Main monitoring orchestrator
    ├── sentry-config.ts     # External service config
    └── monitoring-init.ts   # Initialization logic
```

### 2. Shared Layer (`client/src/lib/`)
Move reusable monitoring infrastructure:
```
shared/
├── infrastructure/
│   ├── monitoring/          # 🔄 NEW - Move from core/monitoring
│   │   ├── error-monitor.ts      # Rename: enhanced-error-monitoring.ts
│   │   ├── performance-monitor.ts # Rename: enhanced-performance-monitoring.ts
│   │   ├── sentry-integration.ts # Extract from sentry-config.ts
│   │   └── monitoring-bridge.ts  # Integration utilities
│   └── store/
│       └── slices/
│           └── errorAnalyticsSlice.ts # ✅ Already here
```

### 3. Features Layer (`client/src/features/`)
Move domain-specific monitoring:
```
features/
├── analytics/
│   ├── model/
│   │   └── error-analytics-bridge.ts # 🔄 Move from /services
│   └── ui/
│       └── dashboard/
└── monitoring/              # 🔄 NEW - Monitoring as a feature
    ├── model/
    │   ├── performance-benchmarking.ts # 🔄 Move from /utils
    │   └── render-tracker.ts          # 🔄 Move from /utils
    └── ui/
        └── dashboard/
```

### 4. Utils Cleanup (`client/src/utils/`)
Keep only pure utilities:
```
utils/
├── logger.ts               # ✅ Keep - pure utility
├── cn.ts                   # ✅ Keep - pure utility
├── browser.ts              # ✅ Keep - pure utility
└── ...other pure utilities
```

## Migration Actions

### Phase 1: Rename Files (Remove "enhanced" prefix)
- `enhanced-error-monitoring.ts` → `error-monitor.ts`
- `enhanced-performance-monitoring.ts` → `performance-monitor.ts`
- `enhanced-monitoring-integration.ts` → `monitoring-integration.ts`

### Phase 2: Move Files to Appropriate FSD Layers

#### From `/services` to `/features/analytics/model/`:
- `errorAnalyticsBridge.ts` → `features/analytics/model/error-analytics-bridge.ts`
- `privacyAnalyticsService.ts` → `features/analytics/model/privacy-analytics.ts`

#### From `/utils` to `/features/monitoring/model/`:
- `performance-benchmarking.ts` → `features/monitoring/model/performance-benchmarking.ts`
- `render-tracker.ts` → `features/monitoring/model/render-tracker.ts`

#### From `/core/monitoring` to `/shared/infrastructure/monitoring/`:
- `enhanced-error-monitoring.ts` → `shared/infrastructure/monitoring/error-monitor.ts`
- `enhanced-performance-monitoring.ts` → `shared/infrastructure/monitoring/performance-monitor.ts`

### Phase 3: Update Import Paths
Update all imports to reflect new structure:
```typescript
// Old
import { errorAnalyticsBridge } from '@/services/errorAnalyticsBridge';
import ErrorMonitoring from '@/infrastructure/monitoring/enhanced-error-monitoring';

// New  
import { errorAnalyticsBridge } from '@/features/analytics/model/error-analytics-bridge';
import { ErrorMonitor } from '@/shared/infrastructure/monitoring/error-monitor';
```

## Benefits of This Structure

1. **Clear separation of concerns**: Core foundations vs shared infrastructure vs feature-specific logic
2. **Better discoverability**: Related functionality grouped logically
3. **Improved maintainability**: Smaller, focused modules
4. **FSD compliance**: Follows Feature-Sliced Design principles
5. **Semantic naming**: Removes unnecessary "enhanced" prefixes

## Implementation Priority

1. **High Priority**: Rename files to remove "enhanced" prefix
2. **Medium Priority**: Move `/services` files to appropriate FSD layers
3. **Low Priority**: Move `/utils` files (ensure no breaking changes)

## Notes

- The core error and performance systems are already well-structured
- The main issue is the scattered monitoring infrastructure
- Legacy `/services` directory contains valuable functionality that should be preserved
- Some utilities in `/utils` are actually feature-specific and should be moved
