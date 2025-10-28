# Development-Focused Utility Consolidation

## 🎯 Simplified Development Approach

Since you're in **development mode**, we can take a much more direct approach without the complex migration adapters, feature flags, and legacy compatibility layers that would be needed in production.

## 🚀 Direct Consolidation Strategy

### **Core Principle**: Replace, Don't Migrate
- **Delete legacy files immediately** 
- **Update imports directly**
- **No compatibility layers needed**
- **No feature flags required**

## 📋 Immediate Action Plan

### Phase 1: Direct Replacement (This Week)

#### 1.1 Logging Consolidation ⚡ **IMMEDIATE**
```bash
# Delete legacy files
rm client/src/utils/logger.ts
rm server/utils/logger.ts

# Update all imports to use shared core
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*utils/logger|from "@shared/core/utils/browser-logger"|g'
```

**Single Import Pattern**:
```typescript
// Replace ALL logging imports with this:
import { logger } from '@shared/core/utils/browser-logger';

// Works everywhere - browser, server, components
logger.info('Message', { context });
logger.error('Error', error, { context });
```

#### 1.2 Cache Consolidation ⚡ **IMMEDIATE**
```bash
# Delete legacy cache files
rm client/src/utils/cache-strategy.ts
rm server/utils/cache.ts

# Update imports
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*utils/cache|from "@shared/core/caching"|g'
```

**Single Cache Pattern**:
```typescript
// Replace ALL cache imports with this:
import { CacheFactory } from '@shared/core/caching';

const cache = CacheFactory.create({ adapter: 'memory' });
await cache.set('key', value);
const result = await cache.get('key');
```

#### 1.3 Performance Consolidation ⚡ **IMMEDIATE**
```bash
# Delete legacy performance files
rm client/src/utils/performanceMonitoring.ts
rm server/utils/performance-monitoring-utils.ts

# Update imports
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*performanceMonitoring|from "@shared/core/performance"|g'
```

**Single Performance Pattern**:
```typescript
// Replace ALL performance imports with this:
import { PerformanceMonitor } from '@shared/core/performance';

const monitor = PerformanceMonitor.create();
monitor.trackMetric('operation', duration);
```

#### 1.4 API Utilities Consolidation ⚡ **IMMEDIATE**
```bash
# Delete legacy API files
rm client/src/utils/api-health.ts
rm server/utils/api.ts

# Update imports
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*utils/api|from "@shared/core/utils/api"|g'
```

**Single API Pattern**:
```typescript
// Replace ALL API imports with this:
import { ApiClient, ApiResponse } from '@shared/core/utils/api';

const client = ApiClient.create({ baseURL: '/api' });
const response = await client.get('/users');
```

### Phase 2: Async Utilities Cleanup (This Week)

#### 2.1 Race Condition Prevention ⚡ **IMMEDIATE**
```bash
# Delete legacy async files
rm client/src/utils/race-condition-prevention.ts
rm server/utils/race-condition-prevention.ts

# Update imports
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*race-condition-prevention|from "@shared/core/utils/async-utils"|g'
```

**Single Async Pattern**:
```typescript
// Replace ALL async utility imports with this:
import { retry, debounce, throttle, CircuitBreaker } from '@shared/core/utils/async-utils';

const circuit = new CircuitBreaker(apiCall);
const debouncedFn = debounce(fn, 300);
```

## 🗂️ Simplified File Structure

### After Consolidation:
```
shared/core/
├── utils/
│   ├── browser-logger.ts     # ✅ Single logging solution
│   ├── async-utils.ts        # ✅ Single async solution
│   └── api/                  # ✅ Single API solution
├── caching/                  # ✅ Single cache solution
└── performance/              # ✅ Single performance solution

client/src/
├── utils/                    # 🗑️ MOSTLY EMPTY after cleanup
│   └── dom-helpers.ts        # Only browser-specific utilities
└── components/               # ✅ Keep component utilities
    ├── ui/utils/            # ✅ Preserved
    ├── dashboard/utils/     # ✅ Preserved
    └── navigation/utils/    # ✅ Preserved

server/
└── utils/                    # 🗑️ MOSTLY EMPTY after cleanup
    └── middleware-utils.ts   # Only server-specific utilities
```

## 🛠️ Implementation Script

Create this script to automate the cleanup:

<function_calls>
<invoke name="fsWrite">
<parameter name="path">scripts/development-cleanup.shin/bash

# Development Utility Consolidation Cleanup Script
# This script directly removes legacy files and updates imports

echo "🚀 Starting development utility consolidation..."

# Backup current state (just in case)
echo "📦 Creating backup..."
git add -A
git commit -m "Backup before utility consolidation cleanup" || echo "No changes to backup"

# 1. Remove legacy logging files
echo "🗑️ Removing legacy logging files..."
rm -f client/src/utils/logger.ts
rm -f server/utils/logger.ts

# 2. Remove legacy cache files  
echo "🗑️ Removing legacy cache files..."
rm -f client/src/utils/cache-strategy.ts
rm -f server/utils/cache.ts

# 3. Remove legacy performance files
echo "🗑️ Removing legacy performance files..."
rm -f client/src/utils/performanceMonitoring.ts
rm -f server/utils/performance-monitoring-utils.ts

# 4. Remove legacy API files
echo "🗑️ Removing legacy API files..."
rm -f client/src/utils/api-health.ts
rm -f server/utils/api.ts

# 5. Remove legacy async files
echo "🗑️ Removing legacy async files..."
rm -f client/src/utils/race-condition-prevention.ts
rm -f server/utils/race-condition-prevention.ts

# 6. Update imports - Logging
echo "🔄 Updating logging imports..."
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .git | \
  xargs sed -i.bak "s|from ['\"].*utils/logger['\"]|from '@shared/core/utils/browser-logger'|g"

# 7. Update imports - Cache
echo "🔄 Updating cache imports..."
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .git | \
  xargs sed -i.bak "s|from ['\"].*utils/cache['\"]|from '@shared/core/caching'|g"

# 8. Update imports - Performance
echo "🔄 Updating performance imports..."
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .git | \
  xargs sed -i.bak "s|from ['\"].*performanceMonitoring['\"]|from '@shared/core/performance'|g"

# 9. Update imports - API
echo "🔄 Updating API imports..."
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .git | \
  xargs sed -i.bak "s|from ['\"].*utils/api['\"]|from '@shared/core/utils/api'|g"

# 10. Update imports - Async
echo "🔄 Updating async imports..."
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .git | \
  xargs sed -i.bak "s|from ['\"].*race-condition-prevention['\"]|from '@shared/core/utils/async-utils'|g"

# 11. Clean up backup files
echo "🧹 Cleaning up backup files..."
find . -name "*.bak" -delete

# 12. Update package.json scripts if needed
echo "📝 Checking for any remaining references..."
grep -r "utils/logger\|utils/cache\|performanceMonitoring" --include="*.ts" --include="*.tsx" . | head -10

echo "✅ Development consolidation complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to check for any import errors"
echo "2. Run 'npm test' to ensure everything still works"
echo "3. Fix any remaining import issues manually"
echo "4. Commit the changes: git add -A && git commit -m 'Consolidate utilities to shared core'"